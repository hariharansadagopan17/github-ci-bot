#!/usr/bin/env node

// Test Loki URL construction
const lokiUrl = 'http://localhost:3101';
console.log('Original lokiUrl:', lokiUrl);

// Original problematic construction
const badUrl = `${lokiUrl}/loki/api/v1/query_range`;
console.log('Bad URL construction:', badUrl);

// Fixed construction  
let baseUrl = lokiUrl.replace(/\/$/, '');
console.log('After removing trailing slash:', baseUrl);

if (!baseUrl.endsWith('/')) {
    baseUrl += '/';
}
console.log('After adding slash:', baseUrl);

const goodUrl = `${baseUrl}loki/api/v1/query_range`;
console.log('Good URL construction:', goodUrl);

// Test curl command
const query = 'test';
const start = Date.now();
const end = Date.now();

const curlCommand = `curl -s '${goodUrl}?query=${encodeURIComponent(query)}&start=${start}000000&end=${end}000000&limit=100'`;
console.log('Curl command:', curlCommand);
