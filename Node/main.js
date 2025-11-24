let express = require('express')              
let app = express();                        

app.get('/', function(req, res){
    res.send('Hello world');                   
});

app.get('/about', function(req, res){
    res.send('about data');                  
});

app.listen(3000, function() {
    console.log('listening on port 3000');    
});