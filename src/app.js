import express from 'express'
import router from './routes'

import { populate } from './models/trader'
import client from './models/amp-client'

let app = express()
app.use(express.static('public'))

app.use('/api', router)

client.start()
  .then( _ => {
    let subscriptions = client.pairs().slice(0.3)
      .map( pair => client.subscribe(pair.baseTokenAddress, pair.quoteTokenAddress) )
    return Promise.all(subscriptions)
  }).then( _ => {
    console.log(client.my_orders())
  }).then( _ => {
    app.listen(3000, () => {
      console.log('App listening on port 3000')
    })
  }).catch( msg => {
    console.log({err: msg.toString(), msg: msg})
  })

