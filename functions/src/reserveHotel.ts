import * as admin from "firebase-admin"
import Firestore = require("firebase-admin/firestore")
import {HttpsFunction, onRequest} from "firebase-functions/v2/https"
import {MAX_INSTANCE_CONCURRENCY, MAX_INSTANCES, MIN_INSTANCES, TIMEOUT_SECONDS} from "./tests/latencyTests"

export const reserveHotelSaga: HttpsFunction = onRequest({ cors: true, region: "europe-west3", minInstances: MIN_INSTANCES, maxInstances: MAX_INSTANCES, concurrency: MAX_INSTANCE_CONCURRENCY, timeoutSeconds: TIMEOUT_SECONDS },async (request, response) => {
    try {
        const data = request.body
        if (!data || !data.hotel_id || !data.customer_id || !data.name || !data.price) {
            throw new Error('Unexpected exception: Missing required data in request body')
        }
            const reservation = await validateAndReserveHotelSaga(data)
            response.send(reservation)
        
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Unknown error'
        response.send({ success: false, error: errorMessage })
    }
})

async function validateAndReserveHotelSaga(data: { hotel_id: string, customer_id: string, name: string, price: number }) {
    try {
        const hotelRef = admin.firestore().collection('hotels')
        const hotelQuerySnapshot = await hotelRef.where('hotel_id', '==', data.hotel_id).get()
        const hotelDoc = hotelQuerySnapshot.docs.at(0)
        
        if (hotelDoc != undefined) {
            const hotelData = hotelDoc.data()
            if (hotelData && hotelData.customer_id === data.customer_id && hotelData.reserved) {
                throw new Error('Expected exception: Hotel already reserved by this customer')
            } else {
                await hotelRef.doc(hotelDoc.id).update({
                    hotel_id: data.hotel_id,
                    from: Firestore.FieldValue.serverTimestamp(),
                    name: data.name,
                    customer_id: data.customer_id,
                    price: data.price,
                    to: Firestore.FieldValue.serverTimestamp(),
                    reserved: true,
                    locked: false
                })
            }
        } else {
            await hotelRef.doc().create({
                hotel_id: data.hotel_id,
                from: Firestore.FieldValue.serverTimestamp(),
                name: data.name,
                customer_id: data.customer_id,
                price: data.price,
                to: Firestore.FieldValue.serverTimestamp(),
                reserved: true,
                locked: false
            })
        }

        return {success: true}
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Unexpected exception'
        return {success: false, error: errorMessage}
    }
}

export const rollbackHotelSaga: HttpsFunction = onRequest({ cors: true, region: "europe-west3", minInstances: MIN_INSTANCES, maxInstances: MAX_INSTANCES, concurrency: MAX_INSTANCE_CONCURRENCY, timeoutSeconds: TIMEOUT_SECONDS },async (request, response) => {
    try {
        const data = request.body
        if (!data || !data.hotel_id || !data.customer_id) {
            throw new Error('Unexpected exception: Missing required data in request body')
        }

        const hotelRef = admin.firestore().collection('hotels')
        const hotelQuerySnapshot = await hotelRef.where('hotel_id', '==', data.hotel_id).get()
        const hotelDoc = hotelQuerySnapshot.docs.at(0)
        
        if (hotelDoc != undefined) {
            const hotelData = hotelDoc.data()
            if (hotelData && hotelData.customer_id === data.customer_id && hotelData.reserved) {
                await hotelRef.doc(hotelDoc.id).set({reserved: false})
            } else {
                throw new Error('Unexpected exception: No matching reservation found for rollback')
            }
            response.send({success: true})
        }
        throw new Error(`Unexpected exception: Hotel does not exist for hotelid ${data.hotel_id} docs found: ${hotelQuerySnapshot.docs.length}`)
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Unexpected exception'
        response.send({ success: false, error: errorMessage })
    }
})
export const canReserveHotel: HttpsFunction = onRequest({ cors: true, region: "europe-west3", minInstances: MIN_INSTANCES, maxInstances: MAX_INSTANCES, concurrency: MAX_INSTANCE_CONCURRENCY, timeoutSeconds: TIMEOUT_SECONDS },async (request, response)=> {
    try {
        const data = request.body
        if (!data || !data.hotel_id || !data.customer_id || !data.name || !data.price || !data.transaction_id) {
            throw new Error('Unexpected exception: Missing required data in request body')
        }
        const hotelRef = admin.firestore().collection('hotels')
        const hotelQuerySnapshot = await hotelRef.where('hotel_id', '==', data.hotel_id).get()
        const hotelDoc = hotelQuerySnapshot.docs.at(0)
        
        if (hotelDoc != undefined) {
            const hotelData = hotelDoc.data()
            if (hotelData) {
                if (hotelData.locked != 0) {
                    throw new Error(`LOCK: Hotel is locked by transaction ${hotelData.locked}, caught in preparation for ${data.transaction_id}`)
                }
                
                if (hotelData.customer_id === data.customer_id && data.hotelData.reserved) {
                    throw new Error('Expected exception: Hotel already reserved by this customer')
                }
                await hotelRef.doc(hotelDoc.id).update({
                    locked: data.transaction_id
                })
            }
        } else {
            await hotelRef.doc().create({
                hotel_id: data.hotel_id,
                locked: data.transaction_id
            })
        }
        response.send({success: true})
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Unexpected exception'
        response.send({ success: false, error: errorMessage })
    }
})

export const doReserveHotel: HttpsFunction = onRequest({ cors: true, region: "europe-west3", minInstances: MIN_INSTANCES, maxInstances: MAX_INSTANCES, concurrency: MAX_INSTANCE_CONCURRENCY, timeoutSeconds: TIMEOUT_SECONDS },async (request, response)=> {
    try {
        const data = request.body
        if (!data || !data.hotel_id || !data.customer_id || !data.name || !data.price || !data.transaction_id || !data.doCommit) {
            throw new Error('Unexpected exception: Missing required data in request body')
        }

        const hotelRef = admin.firestore().collection('hotels')
        const hotelQuerySnapshot = await hotelRef.where('hotel_id', '==', data.hotel_id).get()
        const hotelDoc = hotelQuerySnapshot.docs.at(0)
        
        if (hotelDoc != undefined) {
            const hotelData = hotelDoc.data()
            if (hotelData && hotelData.locked != data.transaction_id) {
                throw new Error(`LOCK: Hotel is locked by transaction ${hotelData.locked}, caught in preparation for ${data.transaction_id}`)
            }

            if (data.doCommit) {
                await hotelRef.doc(hotelDoc.id).update({
                    from: Firestore.FieldValue.serverTimestamp(),
                    name: data.name,
                    customer_id: data.customer_id,
                    price: data.price,
                    to: Firestore.FieldValue.serverTimestamp(),
                    reserved: true,
                    locked: 0
                })
            } else {
                await hotelRef.doc(hotelDoc.id).update({
                    locked: 0
                })
            }
        } else {
            throw new Error('Unexpected Exception: Hotel does not exist')
        }
        response.send({success: true})
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Unexpected exception'
        response.send({ success: false, error: errorMessage })
    }
})


