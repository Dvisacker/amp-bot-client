import { utils } from 'ethers'
import { orderbook } from 'amp-node-api-client'
import client from './amp-client'
import * as binance from './binance'
import { gauss, getPricePoints } from '../utils'


export const add_order = query => {
  let ord = {
    amount: 0.001,
    price: 0.001,
    userAddress: "0xf2934427c36ba897f9be6ed554ed2dbce3da1c68",
    exchangeAddress: "0x2768f1543ec9145cb680fc9699672c1a3226346d",
    makeFee: 0,
    takeFee: 0,
    side: "BUY",
    baseTokenAddress: "0x194f4ec528eba59c3b73b05af044e97bc11c292a",
    quoteTokenAddress: "0xa3f9eacdb960d33845a4b004974feb805e05c4a9",
  }
  Object.assign(ord, query)

  return client.new_order(ord)
}


export const cancel_all = _ => {
  let cancels = client.my_orders()
    .filter( ele => ele.status!="FILLED" && ele.status!="CANCELLED")
    .map( order => client.cancel_order(order.hash) )

  return Promise.all(cancels)
}



const getPricesForPair = pair => {
  return binance.getPrice(pair.baseTokenSymbol)
    .then( price => {
      return { address: pair.baseTokenAddress, prices: price }
    })
}


const getCancelOrdersForPair = tok => {
  let myorders = Object.values(orderbook)
    .filter( ord => ord.status!="CANCELLED" && ord.status!="FILLED" )
  let cancels = myorders.filter( ord => ord.baseToken === tok.address )

  return cancels
}


const getNewOrdersForPair = tok => {
  let mid = getPricePoints(tok.prices[0].ave).add(getPricePoints(tok.prices[1].ave)).div(2)
  let orders = []

  tok.prices.forEach( (price, ind) => {
    [-2,-1.5,-1,-0.5,0,0.5,1,1.5,2].filter( ds => {
      let xx = getPricePoints(price.ave + ds*price.dev)
      return ind===0 ? xx.add(2).lt(mid) : xx.sub(2).gt(mid)
    })
    .forEach( ds => {
      let xx = price.ave + ds*price.dev
      let yy = gauss(xx, price.ave, price.dev)

      orders.push({
        amount: 0.01*yy/gauss(price.ave, price.ave, price.dev)/xx,
        price: xx,
        pricepoint: getPricePoints(xx).toString(),
        userAddress: client.wallet.address,
        exchangeAddress: "0x2768f1543ec9145cb680fc9699672c1a3226346d",
        makeFee: 0,
        takeFee: 0,
        side: ["BUY", "SELL"][ind],
        baseTokenAddress: tok.address,
        quoteTokenAddress: "0xa3f9eacdb960d33845a4b004974feb805e05c4a9"
      })
    })
  })

  return orders
}


const sortOrders = (a, b) => {
  let aprice = utils.bigNumberify( a.pricepoint )
  let bprice = utils.bigNumberify( b.pricepoint )

  if (aprice.lt(bprice)) return 1
  else if (aprice.gt(bprice)) return -1

  //cancel orders go first
  if ('hash' in a) return 1
  return -1
}


const submitOrder = (ordlist, ord) => {
  ord.time = Date.now()
  if ('hash' in ord) {
    return client.cancel_order(ord.hash)
      .then( cancelled => {
        cancelled.time = Date.now()
        ordlist.push(cancelled)
        return ordlist
      })
  }

  return client.new_order(ord)
    .then( added => {
      added.time = Date.now()
      ordlist.push(added)
      return ordlist
    })

  
//  let news = ords.map( ord => client.new_order(ord)
//    .then( ord => `${ord.event.type} ${ord.event.payload.pairName}`)
//    .catch( msg => {
//      throw new Error(msg.toString())
//    }) )
//  return Promise.all(news)
}


const prepOrders = pair => {
  return getPricesForPair(pair)
    .then( tok => {
      let cancels = getCancelOrdersForPair(tok)
//        .map(ele=>"cancel: "+Object.keys(ele).join('/'))
      let newords = getNewOrdersForPair(tok)
//        .map(ele=>"neword: "+Object.keys(ele).join('/'))
      let allords = [...cancels, ...newords]

      allords.sort( sortOrders )

      return allords.reduce( (tot, ord) => {
        tot = tot.then( ordlist => submitOrder(ordlist, ord).catch( msg => { throw {msg: msg, list: ordlist, order: ord} } ) )
        return tot
      }, Promise.resolve([]))
//      .then(ordlist => 
//        ordlist.map(ord=>ord.pricepoint)
//      )

//        .map(ele=>`${ele.pricepoint} ${ele.pairName}`)
    }).catch(msg => {
      return {msg: msg, pair: pair}
    })
}
 
export const populate = _ => {
  let allorders = client.pairs()
    .map(prepOrders)

  return Promise.all(allorders)
}

