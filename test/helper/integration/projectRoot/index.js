exports.handler = (event, context, callback) => {
    console.log('Hello, world!');
    callback(null, 'Hello from Lambda');
};