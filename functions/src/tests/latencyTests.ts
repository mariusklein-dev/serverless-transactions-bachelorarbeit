import {HttpsFunction, onRequest} from "firebase-functions/v2/https"
import {
    API_KEY,
    calculateTransactionStatistics,
    generateRandomSuccessTransactionDataForTroughput,
    stressTestTransaction, stressTestTransactionThroughput,
    TransactionResult
} from "../index"

const LATENCY_MAX = 100
const LATENCY_MAX_IN_SYNC = 25

const THROUGHPUT_MAX = 200
const THROUGHPUT_MAX_IN_SYNC = 25
const THROUGHPUT_DOUBLE_ACCESS = 5

//ALWAYS DEPLOY WITH ZERO AFTER RUNNING TESTS! 30 Days = ~98€ for one minimal instance on 256mib & 1vCPU
//Cost projection for 25: 2500€ minimum
export const MIN_INSTANCES = 0
export const MAX_INSTANCES = 100
export const MAX_INSTANCE_CONCURRENCY = 10
//seq par: 25min & 10 concurrent
//durchsatz: 20min, 20max, 10 concurrent

export const TIMEOUT_SECONDS = 900

export const runTransactionsAsync: HttpsFunction = onRequest({ cors: true, region: "europe-west3", timeoutSeconds: TIMEOUT_SECONDS }, async (request, response) => {
    const apiKey = request.headers['x-api-key']

    if (apiKey !== API_KEY) {
        response.status(401).send('Unauthorized: Invalid API key')
        return
    }

    const data = request.body
    let funcName: string
    let shouldFail: boolean
    if (data || data.should_fail.isBoolean || data.function.isString) {
        shouldFail = data.should_fail
        funcName = data.function
    } else {
        funcName = "doTransactionSaga"
        shouldFail = false
    }

    const results: TransactionResult[][] = []
    for (let batch = 0; batch < LATENCY_MAX; batch++) {
        results[batch] = await Promise.all(
            Array.from({length: LATENCY_MAX_IN_SYNC}).map(() => stressTestTransaction(funcName, shouldFail))
        )
    }

    var successCountTotal = 0
    var failCountTotal = 0
    var totalAverage = 0
    var averageDurations: number[] = []
    var durationsTotal: number[][] = []
    for (let batch = 0; batch < LATENCY_MAX; batch++) {
        const {
            successCount,
            failureCount,
            averageDuration,
            durations
        } = calculateTransactionStatistics(results.at(batch) as TransactionResult[])
        successCountTotal += successCount
        failCountTotal += failureCount
        averageDurations.push(averageDuration)
        totalAverage += averageDuration
        totalAverage = totalAverage / LATENCY_MAX
        durationsTotal.push(durations)
    }
    
    return new Promise((resolve) => {
        response.json({
            funcName,
            successCountTotal,
            failCountTotal,
            totalAverage,
            averageDurations,
            durationsTotal
        })
        resolve()
    })
})

export const runTransactionsSync: HttpsFunction = onRequest({ cors: true, region: "europe-west3", timeoutSeconds: TIMEOUT_SECONDS }, async (request, response) => {
    const apiKey = request.headers['x-api-key']

    if (apiKey !== API_KEY) {
        response.status(401).send('Unauthorized: Invalid API key')
        return
    }

    const data = request.body
    let funcName: string
    let shouldFail: boolean
    if (data || data.should_fail.isBoolean || data.function.isString) {
        shouldFail = data.should_fail
        funcName = data.function
    } else {
        funcName = "doTransactionSaga"
        shouldFail = false
    }
    
    var results = []
    var i: number = 0
    while (i < LATENCY_MAX) {
        results.push(await stressTestTransaction(funcName, shouldFail))
        i = i+1
    }

    const {
        successCount,
        failureCount,
        averageDuration,
        durations
    } = calculateTransactionStatistics(results)

    return new Promise((resolve) => {
        response.json({
            funcName,
            successCount,
            failureCount,
            averageDuration,
            durations
        })
        resolve()
    })
})

export const runThroughputTest: HttpsFunction = onRequest({ cors: true, region: "europe-west3", timeoutSeconds: TIMEOUT_SECONDS }, async (request, response) => {
    const apiKey = request.headers['x-api-key']
    
    if (apiKey !== API_KEY) {
        response.status(401).send('Unauthorized: Invalid API key')
        return
    }

    const data = request.body
    let funcName: string
    let failmodifier: number
    if (data || data.function.isString || data.concurrentaccess.isInteger) {
        funcName = data.function
        failmodifier = data.concurrentaccess
    } else {
        funcName = "doTransactionSaga"
        failmodifier = THROUGHPUT_DOUBLE_ACCESS
    }

    let dataHotels = []
    for (let i = 0; i < THROUGHPUT_MAX * THROUGHPUT_MAX_IN_SYNC; i++) {
        dataHotels.push(generateRandomSuccessTransactionDataForTroughput())
    }
    let dataUsers = []
    for (let i = 0; i < THROUGHPUT_MAX_IN_SYNC - failmodifier; i++) {
        dataUsers.push(generateRandomSuccessTransactionDataForTroughput())
    }

    const results: TransactionResult[][] = []
    let users = 0
    let hotels = 0

    let completed = false

    const globalStartTime = Date.now()

    for (let batch = 0; batch < THROUGHPUT_MAX; batch++) {
        const batchResults = []
        for (let i = 0; i < THROUGHPUT_MAX_IN_SYNC; i++) {
            batchResults.push(stressTestTransactionThroughput(funcName, dataUsers[users], dataHotels[hotels]))
            hotels++
            users++
            if (users === THROUGHPUT_MAX_IN_SYNC - failmodifier) {
                users = 0
            }
            if (Date.now() - globalStartTime >= 60000) {
                completed = true
                break
            }
        }
        users = 0
        if (hotels === THROUGHPUT_MAX * THROUGHPUT_MAX_IN_SYNC) {
            hotels = 0
        }
        results[batch] = await Promise.all(batchResults)
        if (Date.now() - globalStartTime >= 60000) {
            completed = true
            break
        }
    }
    
    var successCountTotal = 0
    var failCountTotal = 0
    var successToFailRatio = 0
    var averageDurations: number[] = []
    var durationsTotal: number[][] = []
    for (let batch = 0; batch < results.length; batch++) {
        const {
            successCount,
            failureCount,
            averageDuration,
            durations
        } = calculateTransactionStatistics(results.at(batch) as TransactionResult[])
        successCountTotal += successCount
        failCountTotal += failureCount
        averageDurations.push(averageDuration)
        durationsTotal.push(durations)
    }
    successToFailRatio = successCountTotal / failCountTotal

    return new Promise((resolve) => {
        response.json({
            funcName,
            completed,
            successCountTotal,
            failCountTotal,
            successToFailRatio,
            averageDurations,
            durationsTotal
        })
        resolve()
    })
})