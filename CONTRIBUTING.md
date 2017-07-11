## JS guidelines
1. All anonymous functions **must be** arrow functions.
    ```js
    // This is ok
    utils.ajaxGet('/ajax/episode/info', params)
      .then(resp => {
        resolve(JSON.parse(resp))
      })
      .catch(err => {
        reject(err)
      })
      
    // This is NOT ok. Arrow functions looks
    // much cleaner for this purpose.
    utils.ajaxGet('/ajax/episode/info', params)
      .then(function(resp){
        resolve(JSON.parse(resp))
      })
      .catch(function(err){
        reject(err)
      })
    ```