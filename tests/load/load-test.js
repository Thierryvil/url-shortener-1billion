import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';

const BASE_URL = (__ENV.BASE_URL || 'http://app:5000').replace(/\/$/, '');
const SCENARIO = __ENV.SCENARIO || 'smoke';

function positiveInteger(name, fallback) {
    const value = Number(__ENV[name] || fallback);

    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }

    return value;
}

function ratio(name, fallback) {
    const value = Number(__ENV[name] || fallback);

    if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new Error(`${name} must be between 0 and 1`);
    }

    return value;
}

function duration(name, fallback) {
    return __ENV[name] || fallback;
}

function constantArrivalRate({
    execFunction,
    rate,
    testDuration,
    preAllocatedVUs,
    maxVUs,
}) {
    return {
        executor: 'constant-arrival-rate',
        exec: execFunction,
        rate,
        timeUnit: '1s',
        duration: testDuration,
        preAllocatedVUs,
        maxVUs,
        gracefulStop: '5s',
    };
}

function redirectArrivalRate(rate, testDuration, defaultPreAllocatedVUs, defaultMaxVUs) {
    return constantArrivalRate({
        execFunction: 'redirect',
        rate,
        testDuration,
        preAllocatedVUs: positiveInteger(
            'REDIRECT_PRE_ALLOCATED_VUS',
            defaultPreAllocatedVUs,
        ),
        maxVUs: positiveInteger('REDIRECT_MAX_VUS', defaultMaxVUs),
    });
}

function creationArrivalRate(rate, testDuration, defaultPreAllocatedVUs, defaultMaxVUs) {
    return constantArrivalRate({
        execFunction: 'createUrl',
        rate,
        testDuration,
        preAllocatedVUs: positiveInteger(
            'CREATION_PRE_ALLOCATED_VUS',
            defaultPreAllocatedVUs,
        ),
        maxVUs: positiveInteger('CREATION_MAX_VUS', defaultMaxVUs),
    });
}

const scenarioBuilders = {
    smoke() {
        return {
            smokeRedirects: redirectArrivalRate(
                positiveInteger('REDIRECT_RPS', 100),
                duration('DURATION', '10s'),
                20,
                100,
            ),
        };
    },

    'mixed-average'() {
        const testDuration = duration('DURATION', '10m');

        return {
            averageRedirects: redirectArrivalRate(
                positiveInteger('REDIRECT_RPS', 11574),
                testDuration,
                2000,
                5000,
            ),
            averageCreations: creationArrivalRate(
                positiveInteger('CREATION_RPS', 116),
                testDuration,
                100,
                500,
            ),
        };
    },

    'redirect-peak'() {
        return {
            peakRedirects: redirectArrivalRate(
                positiveInteger('REDIRECT_RPS', 120000),
                duration('DURATION', '5m'),
                15000,
                30000,
            ),
        };
    },

    'creation-peak'() {
        return {
            peakCreations: creationArrivalRate(
                positiveInteger('CREATION_RPS', 2000),
                duration('DURATION', '5m'),
                500,
                2000,
            ),
        };
    },

    'viral-spike'() {
        const baselineRps = positiveInteger('BASELINE_RPS', 11574);
        const peakRps = positiveInteger('PEAK_RPS', 120000);

        if (peakRps <= baselineRps) {
            throw new Error('PEAK_RPS must be greater than BASELINE_RPS');
        }

        return {
            viralSpike: {
                executor: 'ramping-arrival-rate',
                exec: 'redirect',
                startRate: baselineRps,
                timeUnit: '1s',
                preAllocatedVUs: positiveInteger(
                    'REDIRECT_PRE_ALLOCATED_VUS',
                    15000,
                ),
                maxVUs: positiveInteger('REDIRECT_MAX_VUS', 30000),
                gracefulStop: '5s',
                stages: [
                    {
                        target: baselineRps,
                        duration: duration('BASELINE_DURATION', '1m'),
                    },
                    {
                        target: peakRps,
                        duration: duration('SPIKE_RAMP_DURATION', '1s'),
                    },
                    {
                        target: peakRps,
                        duration: duration('PEAK_DURATION', '1m'),
                    },
                    {
                        target: baselineRps,
                        duration: duration('SPIKE_RAMP_DURATION', '1s'),
                    },
                    {
                        target: baselineRps,
                        duration: duration('RECOVERY_DURATION', '1m'),
                    },
                ],
            },
        };
    },

    'cache-warm'() {
        return {
            warmCacheRedirects: redirectArrivalRate(
                positiveInteger('REDIRECT_RPS', 11574),
                duration('DURATION', '5m'),
                2000,
                5000,
            ),
        };
    },

    'cache-cold'() {
        return {
            coldCacheRedirects: constantArrivalRate({
                execFunction: 'coldRedirect',
                rate: positiveInteger('REDIRECT_RPS', 1000),
                testDuration: duration('DURATION', '1m'),
                preAllocatedVUs: positiveInteger(
                    'REDIRECT_PRE_ALLOCATED_VUS',
                    500,
                ),
                maxVUs: positiveInteger('REDIRECT_MAX_VUS', 2000),
            }),
        };
    },

    soak() {
        const testDuration = duration('SOAK_DURATION', '1h');

        return {
            soakRedirects: redirectArrivalRate(
                positiveInteger('REDIRECT_RPS', 11574),
                testDuration,
                2000,
                5000,
            ),
            soakCreations: creationArrivalRate(
                positiveInteger('CREATION_RPS', 116),
                testDuration,
                100,
                500,
            ),
        };
    },

    'creation-volume'() {
        return {
            dailyCreationVolume: {
                executor: 'shared-iterations',
                exec: 'createUrl',
                vus: positiveInteger('VOLUME_VUS', 2000),
                iterations: positiveInteger('VOLUME_ITERATIONS', 10000000),
                maxDuration: duration('VOLUME_MAX_DURATION', '6h'),
            },
        };
    },

    'redirect-volume'() {
        return {
            dailyRedirectVolume: {
                executor: 'shared-iterations',
                exec: 'redirect',
                vus: positiveInteger('VOLUME_VUS', 30000),
                iterations: positiveInteger('VOLUME_ITERATIONS', 1000000000),
                maxDuration: duration('VOLUME_MAX_DURATION', '6h'),
            },
        };
    },
};

if (!scenarioBuilders[SCENARIO]) {
    throw new Error(
        `Unknown SCENARIO "${SCENARIO}". Available scenarios: ${Object.keys(
            scenarioBuilders,
        ).join(', ')}`,
    );
}

const scenarios = scenarioBuilders[SCENARIO]();
const hasRedirects = Object.values(scenarios).some(
    (scenario) => scenario.exec === 'redirect',
);
const hasCreations = Object.values(scenarios).some(
    (scenario) => scenario.exec === 'createUrl',
);
const hasColdRedirects = Object.values(scenarios).some(
    (scenario) => scenario.exec === 'coldRedirect',
);

const thresholds = {
    checks: ['rate>0.999'],
    dropped_iterations: ['count==0'],
    http_req_failed: ['rate<0.001'],
};

if (hasRedirects || hasColdRedirects) {
    thresholds['http_req_duration{operation:redirect}'] = [
        'p(95)<100',
        'p(99)<250',
    ];
}

if (hasCreations || hasColdRedirects) {
    thresholds['http_req_duration{operation:create}'] = [
        'p(95)<250',
        'p(99)<500',
    ];
}

export const options = {
    discardResponseBodies: true,
    maxRedirects: 0,
    scenarios,
    thresholds,
};

const SEED_COUNT = positiveInteger('SEED_COUNT', 100);
const HOT_SET_SIZE = positiveInteger('HOT_SET_SIZE', 5);
const HOT_RATIO = ratio('HOT_RATIO', 0.8);

function postUrl(originalUrl, name) {
    return http.post(
        `${BASE_URL}/api/v1/urls`,
        JSON.stringify({ url: originalUrl }),
        {
            headers: { 'Content-Type': 'application/json' },
            responseType: 'text',
            tags: {
                name,
                operation: 'create',
            },
        },
    );
}

function selectCode(codes) {
    const hotSetSize = Math.min(HOT_SET_SIZE, codes.length);
    const useHotSet = Math.random() < HOT_RATIO || hotSetSize === codes.length;
    const offset = useHotSet ? 0 : hotSetSize;
    const setSize = useHotSet ? hotSetSize : codes.length - hotSetSize;

    return codes[offset + Math.floor(Math.random() * setSize)];
}

export function setup() {
    if (!hasRedirects) {
        return { codes: [] };
    }

    const codes = [];

    for (let index = 0; index < SEED_COUNT; index += 1) {
        const response = postUrl(
            `https://example.com/load-test/seed/${index}`,
            'POST /api/v1/urls (seed)',
        );

        if (response.status !== 201) {
            throw new Error(`Seed request ${index} failed with HTTP ${response.status}`);
        }

        codes.push(response.json('code'));
    }

    for (const code of codes) {
        const response = http.get(`${BASE_URL}/${code}`, {
            redirects: 0,
            tags: {
                name: 'GET /:code (warm-up)',
                operation: 'redirect',
            },
        });

        if (response.status !== 302) {
            throw new Error(`Cache warm-up failed for ${code} with HTTP ${response.status}`);
        }
    }

    return { codes };
}

export function redirect({ codes }) {
    const response = http.get(`${BASE_URL}/${selectCode(codes)}`, {
        redirects: 0,
        tags: {
            name: 'GET /:code',
            operation: 'redirect',
        },
    });

    check(response, {
        'redirect returned HTTP 302': (result) => result.status === 302,
    });
}

export function createUrl() {
    const uniqueSuffix = [
        SCENARIO,
        exec.scenario.iterationInTest,
        exec.vu.idInTest,
    ].join('-');
    const response = postUrl(
        `https://example.com/load-test/create/${uniqueSuffix}`,
        'POST /api/v1/urls',
    );

    check(response, {
        'creation returned HTTP 201': (result) => result.status === 201,
    });
}

export function coldRedirect() {
    const uniqueSuffix = [
        exec.scenario.iterationInTest,
        exec.vu.idInTest,
    ].join('-');
    const creationResponse = postUrl(
        `https://example.com/load-test/cold/${uniqueSuffix}`,
        'POST /api/v1/urls (cold preparation)',
    );

    const creationSucceeded = check(creationResponse, {
        'cold preparation returned HTTP 201': (result) => result.status === 201,
    });

    if (!creationSucceeded) {
        return;
    }

    const code = creationResponse.json('code');
    const redirectResponse = http.get(`${BASE_URL}/${code}`, {
        redirects: 0,
        tags: {
            name: 'GET /:code (cold)',
            operation: 'redirect',
        },
    });

    check(redirectResponse, {
        'cold redirect returned HTTP 302': (result) => result.status === 302,
    });
}
