# TraceOps Playground
Acme Commerce storefront + Telemetry Control Center for end-to-end testing of TraceOps ingestion.

    npm install
    npm run dev      # http://localhost:3000

Works out of the box against a built-in mock ingestion endpoint (`/api/mock-ingest`).
To test real TraceOps, set the ingestion URL and API key in the Control Center (or copy `.env.example` to `.env.local`).
Events are POSTed to your URL with `x-api-key` and `Authorization: Bearer` headers, using the contract:
`{ serviceName, operationName, durationMs, statusCode (1 ok / 2 error), traceId, spanId, httpMethod, httpRoute, httpStatusCode, startTime, endTime, errorMessage, environment, serviceVersion, attributes }`.
