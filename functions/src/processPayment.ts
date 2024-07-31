import {HttpsFunction, onRequest} from "firebase-functions/v2/https"
import * as admin from "firebase-admin"
import {MAX_INSTANCE_CONCURRENCY, MAX_INSTANCES, MIN_INSTANCES, TIMEOUT_SECONDS} from "./tests/latencyTests"

export const processPaymentSaga: HttpsFunction = onRequest({ cors: true, region: "europe-west3", minInstances: MIN_INSTANCES, maxInstances: MAX_INSTANCES, concurrency: MAX_INSTANCE_CONCURRENCY, timeoutSeconds: TIMEOUT_SECONDS },async (request, response) => {
    try {
        const data = request.body
        if (!data || !data.hotel_id || !data.customer_id || !data.price) {
            throw new Error('Unexpected exception: Missing required data in request body')
        }
        const payment = await processPaymentOrchestrated(data)
        response.send(payment)
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Unknown error'
        response.send({ success: false, error: errorMessage })
    }
})

export const processPaymentOrchestrated = async (data: any) => {
    try {
        const {hotel_id, customer_id, price} = data
        const paymentsRef = admin.firestore().collection('payments')
        const balanceRef = admin.firestore().collection('balance')

        const balanceQuerySnapshot = await balanceRef.where('customer_id', '==', customer_id).get()
        const balanceDoc = balanceQuerySnapshot.docs.at(0)

        const batch = admin.firestore().batch()

        //if there is a balance for an account
        if (balanceDoc) {
            const balanceData = balanceDoc.data()
            if (balanceData) {
                if (balanceData.balance < price) {
                    throw new Error('Expected exception: Insufficient funds for this booking')
                }

                const newBalance = balanceData.balance - price
                batch.update(balanceRef.doc(balanceDoc.id), {balance: newBalance, locked: false})
                batch.set(paymentsRef.doc(), {price: price, hotel_id: hotel_id, customer_id: customer_id})
            }
            //if there isn't yet a balance for an account
        } else {
            const balance = Math.floor(Math.random() * (100000 - 98000 + 1) + 98000)

            if (balance < price) {
                throw new Error('Expected exception: Insufficient funds for this booking')
            }
            const newBalanceDoc = balanceRef.doc()
            batch.set(newBalanceDoc, {customer_id: customer_id, balance: balance - price, locked: false})
            batch.set(paymentsRef.doc(), {price: price, hotel_id: hotel_id, customer_id: customer_id})
        }

        await batch.commit()

        return {success: true}
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Unexpected exception'
        return {success: false, error: errorMessage}
    }
}

export const canProcessPayment: HttpsFunction = onRequest({ cors: true, region: "europe-west3", minInstances: MIN_INSTANCES, maxInstances: MAX_INSTANCES, concurrency: MAX_INSTANCE_CONCURRENCY, timeoutSeconds: TIMEOUT_SECONDS },async (request, response) => {
    try {
        const data = request.body
        if (!data || !data.hotel_id || !data.customer_id || !data.name || !data.price || !data.transaction_id) {
            throw new Error('Unexpected exception: Missing required data in request body')
        }
        const balanceRef = admin.firestore().collection('balance')
        
        const balanceQuerySnapshot = await balanceRef.where('customer_id', '==', data.customer_id).get()
        const balanceDoc = balanceQuerySnapshot.docs.at(0)

        if (balanceDoc) {
            const balanceData = balanceDoc.data()
            if (balanceData) {
                if (balanceData.locked == 0 || balanceData.locked == data.transaction_id) {
                    await balanceRef.doc(balanceDoc.id).update({locked: data.transaction_id})

                    if (balanceData.balance < data.price) {
                        throw new Error('Expected exception: Insufficient funds for this booking')
                    }
                } else {
                    throw new Error('LOCK: Balance is currently locked, caught in preperation')
                }
            }
        } else {
            const balance = Math.floor(Math.random() * (100000 - 98000 + 1) + 98000)

            if (balance < data.price) {
                await balanceRef.doc().set({customer_id: data.customer_id, balance: balance, locked: data.transaction_id})
                throw new Error('Expected exception: Insufficient funds for this booking')
            }

            await balanceRef.doc().set({customer_id: data.customer_id, balance: balance, locked: data.transaction_id})
        }

        response.send({success: true})
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Unexpected exception'
        response.send({ success: false, error: errorMessage })
    }
})

export const doPayment: HttpsFunction = onRequest({ cors: true, region: "europe-west3", minInstances: MIN_INSTANCES, maxInstances: MAX_INSTANCES, concurrency: MAX_INSTANCE_CONCURRENCY, timeoutSeconds: TIMEOUT_SECONDS },async (request, response) => {
    try {
        const data = request.body
        if (!data || !data.hotel_id || !data.customer_id || !data.name || !data.price || !data.transaction_id || !data.doCommit) {
            throw new Error('Unexpected exception: Missing required data in request body')
        }
        const paymentsRef = admin.firestore().collection('payments')
        const balanceRef = admin.firestore().collection('balance')
        const balanceQuerySnapshot = await balanceRef.where('customer_id', '==', data.customer_id).get()
        const balanceDoc = balanceQuerySnapshot.docs.at(0)

        if (!balanceDoc) {
            throw new Error('Unexpected exception: Balance not found')
        }
        const balanceData = balanceDoc.data()
        if (balanceData) {
            //only do the commit if balance data is locked with the current transaction ID and commit signal has been given
            if (balanceData.locked == data.transaction_id) {
                if (data.doCommit) {
                    const batch = admin.firestore().batch()
                    batch.update(balanceRef.doc(balanceDoc.id), {balance: balanceData.balance - data.price, locked: 0})
                    batch.create(paymentsRef.doc(), {price: data.price, hotel_id: data.hotel_id, customer_id: data.customer_id})
                    await batch.commit()
                } else {
                    await balanceRef.doc(balanceDoc.id).update({locked: 0})
                    throw new Error('Expected exception: Commit has been successfully aborted')
                }
            } else {
                throw new Error('LOCK: Balance is currently locked, caught in commit operation')
            }
        } else {
            throw new Error('Unexpected exception: Balance data not found')
        }
        response.send({success: true})
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Unexpected exception'
        response.send({ success: false, error: errorMessage })
    }
})