import {HttpsFunction, onRequest} from "firebase-functions/v2/https"
import {MAX_INSTANCE_CONCURRENCY, MAX_INSTANCES, MIN_INSTANCES, TIMEOUT_SECONDS} from "./tests/latencyTests"
import {instance, projectId} from "./index"
import {AxiosResponse} from "axios"

const MAX_RETRIES = 5

export const doTransactionSaga: HttpsFunction = onRequest({
    cors: true,
    region: "europe-west3",
    minInstances: MIN_INSTANCES,
    maxInstances: MAX_INSTANCES,
    concurrency: MAX_INSTANCE_CONCURRENCY,
    timeoutSeconds: TIMEOUT_SECONDS
}, async (request, response) => {
    try {
        const data = request.body
        if (!data || !data.hotel_id || !data.customer_id || !data.name || !data.price) {
            throw new Error('Unexpected exception: Missing required data in request body')
        }
        const reserveFunctionName = "reservehotelsaga"
        const rollbackFunctionName = "rollbackHotelSaga"
        const paymentFunctionName = "processPaymentSaga"

        const reserveUrl = `https://${reserveFunctionName}-${projectId}.a.run.app`
        const rollbackUrl = `https://${rollbackFunctionName}-${projectId}.a.run.app`
        const paymentUrl = `https://${paymentFunctionName}-${projectId}.a.run.app`

        // Schritt 1: Hotel reservieren
        const reserveResponse = await instance.post(reserveUrl, data, {
            headers: {
                "Content-Type": "application/json",
            },
        })

        if (!reserveResponse.data.success) {
            throw new Error(reserveResponse.data.error)
        }

        // Schritt 2: Zahlungsvorgang (using httpsCallable)
        const paymentResponse = await instance.post(paymentUrl, data, {
            headers: {
                "Content-Type": "application/json",
            },
        })
        // Rollback falls nötig
        if (!paymentResponse.data.success) {
            // Reservierung aufheben, wenn Zahlung fehlschlägt
            const rollbackResponse = await instance.post(rollbackUrl, data, {
                headers: {
                    "Content-Type": "application/json",
                },
            })
            if (rollbackResponse.data.success) {
                response.send({success: false})
            } else {
                throw new Error('Unexpected exception: Payment failed but reservation was not successfully canceled')
            }
        }

        // Erfolgreich reserviert
        response.send({success: true})
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Unknown error'
        response.send({success: false, error: errorMessage})
    }
})

export const doTransaction2PC: HttpsFunction = onRequest({
    cors: true,
    region: "europe-west3",
    minInstances: MIN_INSTANCES,
    maxInstances: MAX_INSTANCES,
    concurrency: MAX_INSTANCE_CONCURRENCY,
    timeoutSeconds: TIMEOUT_SECONDS
}, async (request, response) => {
    try {
        const data = request.body
        if (!data || !data.hotel_id || !data.customer_id || !data.name || !data.price) {
            throw new Error('Unexpected exception: Missing required data in request body')
        }
        const canReserveHotel = "canreservehotel"
        const canDoProcessPayment = "canprocesspayment"
        const doReserveHotel = "doreservehotel"
        const doProcessPayment = "dopayment"


        const canReserveUrl = `https://${canReserveHotel}-${projectId}.a.run.app`
        const canPayUrl = `https://${canDoProcessPayment}-${projectId}.a.run.app`
        const doReserveUrl = `https://${doReserveHotel}-${projectId}.a.run.app`
        const doPaymentUrl = `https://${doProcessPayment}-${projectId}.a.run.app`

        //Schritt 1: evaluieren ob die Transaktion ausgeführt werden kann
        const [canReserveResponse, canDoPaymentResponse] = await Promise.all([
            retryableOnLockRequestWrapper(canReserveUrl, data, {
                "Content-Type": "application/json",
            }),
            retryableOnLockRequestWrapper(canPayUrl, data, {
                "Content-Type": "application/json",
            })
        ])

        if (canReserveResponse && canDoPaymentResponse) {
            data.doCommit = canReserveResponse.data.success && canDoPaymentResponse.data.success
        } else {
            throw new Error("Unexpected Error: undefined response CAN")
        }
        
        //Schritt 2: Ausführen der Transaktion oder ressourcen entsperren, mit retry wenn Ressourcen von einer anderen Transaktion gesperrt sind
        const [doReserveResponse, doPaymentResponse] = await Promise.all([
            retryableOnLockRequestWrapper(doReserveUrl, data, {
                "Content-Type": "application/json",
            }),
            retryableOnLockRequestWrapper(doPaymentUrl, data, {
                "Content-Type": "application/json",
            })
        ])

        if (doReserveResponse && doPaymentResponse) {
            data.doCommit = canReserveResponse.data.success && canDoPaymentResponse.data.success
        } else {
            throw new Error("Unexpected Error: undefined response DO")
        }
        
        //Antworten mit Transaktionserfolg oder Fehlschlag
        response.send({success: doReserveResponse.data.success && doPaymentResponse.data.success})
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Unknown error'
        response.send({success: false, error: errorMessage})
    }
})

async function retryableOnLockRequestWrapper(url: string, data: any, headers: any, attempt = 1): Promise<AxiosResponse<any, any> | undefined> {
    const response = await instance.post(url, data, {headers})
    if (response.data && response.data.error && response.data.error.startsWith("LOCK")) {
        if (attempt === MAX_RETRIES) {
            throw new Error('Expected Error: Maximum retry attempts reached')
        }
        //25 -> 50 -> 75 -> 100 -> 125 
        await new Promise((resolve) => setTimeout(resolve, 25 * attempt))
        attempt++
        return await retryableOnLockRequestWrapper(url, data, headers, attempt)
    } else {
        return response
    }
}
