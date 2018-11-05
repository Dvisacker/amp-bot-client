import client from '../models'
import * as trader from '../models'

export const cancelall = (req, res) => {
  trader.cancel_all()
    .then( data => {
      res.status(200).json(data)
    })
    .catch( err => {
      res.json({ msg: err.toString() })
    })
}

export const cancel = (req, res) => {
  client.cancel_order(req.query.hash)
    .then( data => {
      res.status(200).json(data)
    })
    .catch( err => {
      res.json({ msg: err.toString() })
    })
}


export const addorder = (req, res) => {
  trader.add_order(req.query)
    .then( data => {
      res.status(200).json(data)
    })
    .catch( err => {
      res.json({ msg: err.toString() })
    })
}


export const populate = (req, res) => {
  trader.populate()
    .then( data => {
      res.status(200).json(data)
    })
    .catch( err => {
      res.json({ msg: err.toString() })
    })
}


export const myorders = (req, res) => {
  client.my_orders()
    .then( data => {
       res.status(200).json(data)
    })
    .catch( err => {
      res.json({ msg: err.toString() })
    })
}


export const pairs = (req, res) => {
  client.pairs()
    .then( data => {
      res.json(data)
    })
    .catch( _ => {
      res.json({msg: "can't access AMP REST API"})
    })
}
