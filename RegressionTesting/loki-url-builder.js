#!/usr/bin/env node

/**
 * Loki URL Utility
 * Centralized URL construction to prevent double-slash issues
 */

class LokiUrlBuilder {
    constructor(baseUrl = 'http://localhost:3101') {
        this.baseUrl = this.normalizeBaseUrl(baseUrl);
    }

    normalizeBaseUrl(url) {
        // Remove trailing slash and ensure proper format
        const normalized = url.replace(/\/+$/, '');
        console.log(`🔧 Normalized base URL: ${normalized}`);
        return normalized;
    }

    buildQueryUrl(endpoint = 'loki/api/v1/query_range') {
        // Ensure endpoint doesn't start with slash
        const cleanEndpoint = endpoint.replace(/^\/+/, '');
        const fullUrl = `${this.baseUrl}/${cleanEndpoint}`;
        console.log(`🔗 Built URL: ${fullUrl}`);
        return fullUrl;
    }

    buildCurlCommand(query, start, end, limit = 100) {
        const queryUrl = this.buildQueryUrl();
        const encodedQuery = encodeURIComponent(query);
        
        // Extra safety: explicitly prevent double slashes in the URL
        const safeUrl = queryUrl.replace(/\/\/+/g, '/').replace('http:/', 'http://');
        
        const curlCmd = `wsl -d Ubuntu-EDrive -e bash -c "curl -s '${safeUrl}?query=${encodedQuery}&start=${start}000000&end=${end}000000&limit=${limit}'"`;
        
        console.log(`🔍 Curl command: ${curlCmd.substring(0, 120)}...`);
        console.log(`🛡️  URL safety check: ${safeUrl.includes('//loki') ? 'FAILED - Double slash detected!' : 'PASSED - No double slashes'}`);
        return curlCmd;
    }

    buildAxiosUrl(endpoint = 'loki/api/v1/query_range') {
        return this.buildQueryUrl(endpoint);
    }

    buildFetchUrl(query, start, end) {
        const baseQuery = this.buildQueryUrl();
        const encodedQuery = encodeURIComponent(query);
        return `${baseQuery}?query=${encodedQuery}&start=${start}000000&end=${end}000000`;
    }
}

module.exports = LokiUrlBuilder;
