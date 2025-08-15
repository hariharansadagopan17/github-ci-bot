const LokiUrlBuilder = require('./loki-url-builder');
const axios = require('axios');

async function testLokiConnection() {
    console.log('🧪 Testing Loki URL Builder and Connection...\n');
    
    const urlBuilder = new LokiUrlBuilder('http://localhost:3101');
    
    // Test URL construction methods
    console.log('📋 URL Construction Tests:');
    console.log('- Axios URL:', urlBuilder.buildAxiosUrl('/loki/api/v1/query_range'));
    console.log('- Fetch URL:', urlBuilder.buildFetchUrl('/loki/api/v1/query_range'));
    console.log('- Curl Command:', urlBuilder.buildCurlCommand('/loki/api/v1/query_range', {
        query: '{job="test"}',
        start: '1h',
        end: 'now'
    }));
    
    // Test actual connection
    console.log('\n🔗 Testing Loki Connection:');
    try {
        const healthUrl = urlBuilder.buildAxiosUrl('/ready');
        const response = await axios.get(healthUrl, { timeout: 5000 });
        console.log('✅ Loki Health Check: SUCCESS');
        console.log('- Status:', response.status);
        console.log('- Response:', response.data);
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Loki Health Check: CONNECTION REFUSED');
            console.log('- Loki container may not be running on port 3101');
        } else {
            console.log('❌ Loki Health Check: ERROR');
            console.log('- Error:', error.message);
        }
    }
    
    // Test query endpoint
    console.log('\n📊 Testing Loki Query Endpoint:');
    try {
        const queryUrl = urlBuilder.buildAxiosUrl('/loki/api/v1/query_range');
        const params = {
            query: '{job="test"}',
            start: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            end: new Date().toISOString()
        };
        
        const response = await axios.get(queryUrl, { 
            params, 
            timeout: 5000 
        });
        
        console.log('✅ Loki Query Test: SUCCESS');
        console.log('- Status:', response.status);
        console.log('- Data Type:', typeof response.data);
        
    } catch (error) {
        if (error.response) {
            console.log('⚠️ Loki Query Test: HTTP ERROR');
            console.log('- Status:', error.response.status);
            console.log('- Message:', error.response.data);
        } else {
            console.log('❌ Loki Query Test: ERROR');
            console.log('- Error:', error.message);
        }
    }
}

if (require.main === module) {
    testLokiConnection().catch(console.error);
}

module.exports = testLokiConnection;
