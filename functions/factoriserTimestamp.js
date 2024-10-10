function FactoriserTimestamp(timestamp){
    const regex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;
    if(typeof(timestamp) === 'string' && regex.test(timestamp)){
        console.log('Timestamp conforme pour une factorisation')
        timestamp = timestamp.replace('T', ' ')
        timestamp = timestamp.substring(0, timestamp.indexOf('.'))
        return timestamp
    }
    else{
        console.log('Timestamp non conforme pour une factorisation')
    }
}

module.exports = FactoriserTimestamp