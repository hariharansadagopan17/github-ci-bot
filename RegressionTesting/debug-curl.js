const LokiUrlBuilder = require('./loki-url-builder');

console.log('🧪 Debugging Curl Command Generation...\n');

const builder = new LokiUrlBuilder('http://localhost:3101');

// Test with the exact same query that's failing
const testQuery = '{job="regression-tests"} |~ "(?i)(error|failed)"';
const start = Date.now() - 300000; // 5 minutes ago  
const end = Date.now();

console.log('Testing with query:', testQuery);

const curlCommand = builder.buildCurlCommand(testQuery, start, end);

console.log('\n🔍 Analysis:');
console.log('Contains 3101//loki?', curlCommand.includes('3101//loki'));
console.log('Contains 3101/loki?', curlCommand.includes('3101/loki'));

if (curlCommand.includes('3101//loki')) {
    console.log('❌ FOUND DOUBLE SLASH PROBLEM!');
} else {
    console.log('✅ No double slash - URL construction is correct');
}

console.log('\n📝 Full command:');
console.log(curlCommand);

// Let's also test what happens when we execute it
console.log('\n🧪 Testing actual execution...');
const { exec } = require('child_process');

exec(curlCommand, { timeout: 5000 }, (error, stdout, stderr) => {
    if (error) {
        console.log('❌ Command failed:', error.message);
        if (error.message.includes('404') || error.message.includes('connection refused')) {
            console.log('💡 This suggests URL format is correct but Loki might need data or different endpoint');
        }
    } else {
        console.log('✅ Command executed successfully');
        console.log('Response length:', stdout.length);
    }
});
