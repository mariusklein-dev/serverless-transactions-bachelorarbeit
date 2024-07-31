import * as admin from "firebase-admin"
const serviceAccount = require('../sa_secret.json')

//WARNING!!!! HAS TO BE FALSE FOR DEPLOY!
const useEmulator = false

if (useEmulator) {
    //DO NOT DEPLOY WHEN ACTIVE!
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080'
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
})

import {onRequest} from "firebase-functions/v2/https"
import * as logger from "firebase-functions/logger"
import axios from "axios"
import Firestore = require("firebase-admin/firestore")
import * as https from "node:https"

export {reserveHotelSaga, rollbackHotelSaga, canReserveHotel, doReserveHotel} from "./reserveHotel"
export {processPaymentSaga, canProcessPayment, doPayment} from "./processPayment"
export {doTransactionSaga, doTransaction2PC} from "./transactions"
export {runTransactionsAsync, runTransactionsSync, runThroughputTest} from './tests/latencyTests'

export const API_KEY = 'PHNjgM9QnetsTG2xZA3LdA4nevuP3H'
export const projectId = "3yhuqeqsvq-ey"

const httpsAgent = new https.Agent({keepAlive: true})
export const instance = axios.create({
    httpsAgent,
})
export const helloHttp = onRequest({cors: true, region: "europe-west3"}, (request, response) => {
    logger.info("Hello logs!", {
        structuredData: true
    })
    const apiKey = request.headers['x-api-key']
    if (apiKey !== API_KEY) {
        response.status(401).send('Unauthorized: Invalid API key')
        return
    }
    const name = request.query.name || 'World'
    response.send(`Hello, ${name}!`)
})

export interface TransactionData {
    hotel_id: string
    customer_id: string
    price: number
    name: string
    transaction_id: number
    doCommit: boolean
}

export type TransactionResult = {
    success: boolean
    hotel_id?: any
    duration?: number
}

const generateRandomSuccessTransactionData = (): TransactionData => {
    return {
        hotel_id: `hotel_${Math.floor(Math.random() * 2147480000)}`,
        customer_id: `customer_${Math.floor(Math.random() * 2147480000)}`,
        price: Math.floor(Math.random() * 1000) + 1,
        name: `generic_hotel_${Math.floor(Math.random() * 2147480000)}`,
        transaction_id: Math.floor(Math.random() * 2147480000),
        doCommit: false
    }
}

const generateRandomFailTransactionData = (): TransactionData => {
    return {
        hotel_id: `hotel_${Math.floor(Math.random() * 2147480000)}`,
        customer_id: `customer_${Math.floor(Math.random() * 2147480000)}`,
        price: Math.floor(Math.random() * 1000) + 10000000,
        name: `generic_hotel_${Math.floor(Math.random() * 2147480000)}`,
        transaction_id: Math.floor(Math.random() * 2147480000),
        doCommit: false
    }
}

export const generateRandomSuccessTransactionDataForTroughput = (): TransactionData => {
    return {
        hotel_id: `hotel_${Math.floor(Math.random() * 2147480000)}`,
        customer_id: `customer_${Math.floor(Math.random() * 2147480000)}`,
        price: 1,
        name: `generic_hotel_${Math.floor(Math.random() * 2147480000)}`,
        transaction_id: Math.floor(Math.random() * 2147480000),
        doCommit: false
    }
}

export const stressTestTransaction = async (name: String, shouldFail: boolean = false): Promise<{
    success: boolean,
    hotel_id?: any,
    duration: number
} | { success: boolean, error: string }> => {
    let data: TransactionData
    if (shouldFail) {
        data = generateRandomFailTransactionData()
    } else {
        data = generateRandomSuccessTransactionData()
    }
    try {
        const transactionRef = admin.firestore().collection('performance')
        const transactionDoc = transactionRef.doc()

        const url = `https://${name}-${projectId}.a.run.app`
        await transactionDoc.set({
            start: Firestore.FieldValue.serverTimestamp(),
            function: name
        })

        const response = await instance.post(url, data, {
            headers: {
                "Content-Type": "application/json",
            },
        })
        
        await transactionDoc.update({
            finish: Firestore.FieldValue.serverTimestamp(),
            success: response.data.success
        })
        const result = response.data

        const doc = await transactionDoc.get()
        if (doc.exists) {
            const data = doc.data()
            if (data) {
                //Sekunden in millisekunden umwandeln
                const secondsInMilliseconds = data.finish.seconds * 1000 - data.start.seconds * 1000
                //Präzision mit nanosekunden erhöhen, durch 1e6 teilen, da eine millisekunde 1000000 nanosekunden hat
                const nanosecondsInMilliseconds = (data.finish.nanoseconds - data.start.nanoseconds) / 1e6
                const durationInMilliseconds = secondsInMilliseconds + nanosecondsInMilliseconds
                return {...result, duration: durationInMilliseconds}
            }
        }

        return {success: false, error: "Unknown error: Transaction retrieval"}
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Unknown error'
        return {success: false, error: errorMessage}
    }
}

export const stressTestTransactionThroughput = async (name: String, user: TransactionData, hotel: TransactionData): Promise<{
    success: boolean,
    hotel_id?: any,
    duration: number
} | { success: boolean, error: string }> => {
    let data: TransactionData = {
        hotel_id: hotel.hotel_id,
        customer_id: user.customer_id,
        price: 1,
        name: hotel.name,
        transaction_id: Math.floor(Math.random() * 2147480000),
        doCommit: false
    }
    try {
        const transactionRef = admin.firestore().collection('performance')
        const transactionDoc = transactionRef.doc()

        const url = `https://${name}-${projectId}.a.run.app`

        await transactionDoc.set({
            start: Firestore.FieldValue.serverTimestamp(),
            function: name
        })
        const response = await instance.post(url, data, {
            headers: {
                "Content-Type": "application/json",
            },
        })
        await transactionDoc.update({
            finish: Firestore.FieldValue.serverTimestamp(),
            success: response.data.success
        })
        const doc = await transactionDoc.get()
        if (doc.exists) {
            const data = doc.data()
            if (data) {
                //Sekunden in millisekunden umwandeln
                const secondsInMilliseconds = data.finish.seconds * 1000 - data.start.seconds * 1000
                //Präzision mit nanosekunden erhöhen, durch 1e6 teilen, da eine millisekunde 1000000 nanosekunden hat
                const nanosecondsInMilliseconds = (data.finish.nanoseconds - data.start.nanoseconds) / 1e6
                const durationInMilliseconds = secondsInMilliseconds + nanosecondsInMilliseconds
                return {...response.data, duration: durationInMilliseconds}
            }
        }

        return {success: false, error: "Unknown error: Transaction retrieval"}
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Unknown error'
        return {success: false, error: errorMessage}
    }
}

export function calculateTransactionStatistics(results: TransactionResult[]) {
    try {
        const successCount = results.filter(result => result.success).length
        const failureCount = results.length - successCount

        const failures = results.filter(result => !result.success)
        const durations = results
            .filter(result => 'duration' in result)
            .map(result => result.duration as number)

        const totalDuration = durations.reduce((acc, duration) => acc + duration, 0)
        const averageDuration = totalDuration / results.length

        return {
            successCount,
            failureCount,
            failures,
            averageDuration,
            durations
        }
    } catch (error) {
        return {
            successCount: 0,
            failureCount: 0,
            failures: [],
            averageDuration: 0,
            durations: []
        }
    }
}