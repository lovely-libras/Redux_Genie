
module.exports = (Logging) => {

if(Logging === undefined){

return `import { createStore, applyMiddleware } from 'redux'
import { createLogger } from 'redux-logger'
import thunkMiddleware from 'redux-thunk'
import { composeWithDevTools } from 'redux-devtools-extension'
import combinedReducers from './combine_reducers'

const middleware = composeWithDevTools(
  applyMiddleware(thunkMiddleware, createLogger({collapsed: true}))
)

export default createStore(combinedReducers, middleware)`


}
else if (!Logging){
return `import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import {composeWithDevTools} from 'redux-devtools-extension'
import combinedReducers from './combine_reducers'

const middleware = composeWithDevTools(
  applyMiddleware(thunkMiddleware)
)

export default createStore(combinedReducers, middleware)`
}

}