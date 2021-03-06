/*

this method generates a connected React component
from the command line

this copy of the code is annotated a bit more because Babel
is a bit obscure

procedure:

1. parse class or functional component into an AST

2. consume domains that should be mapped 

3. use the domain object to generate the mapStatetoProps method
   parse the initial state object and destructure the object keys

4. use the action files to generate the mapDispatchtoProps method

5. insert everything 

general note:

we want homogenous namespacing- names in the component are identical to
the names in the redux store, so we're going to be using destructuring
assignment whenever possible

string manipuation vs Babel:
  1. Babel is more flexible- can for example generate objects whose values
     are variables- can't really do that very easily with string manipulation
  2. Babel is less brittle, especially for insertion
  3. You can check validity of code as you work- it will
    throw errors. You know the code you're making is valid.
  4. String manipulation is easier for building code, Babel types and
    the build method are imho not very well documented
*/ 

const fs = require('fs');
const parser = require('@babel/parser').parse;
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const prettier = require('prettier');
const t = require("@babel/types");
const chalk = require('chalk')

module.exports = (componentFile, componentName, models, stateObject) => {

  // in the future it would be nice to not require three or four arguments, 
  // but thats not MVP- will add logic upstream with error boundaries etc later
  // ideally- just name the componentFile and the model you want

  // 1. parse class or functional component and convert into an AST
  // that can be operated on as an object - operating on it as a string
  // would be way, way too brittle

  // read the component file  
  let file = fs.readFileSync(componentFile).toString();

  // we're just going to take out any existing export statement
  // and put one at the end - might have exported the component inline

  if(file.includes('export default')){

    const exportText = file.indexOf('export default')
    file = file.slice(0, exportText)
                .concat(file.slice(exportText+14))
                  .concat('export default ' + componentName)
  }
  else{

    throw 'No export statement detected in' + componentFile
  }

  const fileAST = parser(file, {sourceType: 'module', plugins: ['jsx']});

  let componentNode

  let componentType

  // lets figure out if is a functional or class component
  traverse(fileAST, {
    FunctionDeclaration(path){

      // find the function name inside the AST
      if(path.node.id.name === componentName){
        componentNode = path.node
        componentType = 'function'
      }
    },
    ClassDeclaration(path){

      if(path.node.id.name === componentName){
        componentNode = path.node
        componentType = 'class'
      }
    }
  })
 
  // 2. consume domains that should be mapped 
  // parse the initial state object and destructure the object keys

  // lets navigate to the state object
  // we'll figure out where it is based on the file structure

  let Structure

  try {
  
    Structure = JSON.parse(fs.readFileSync("./.lamp-lock.json", "utf8")).Structure
    
  } catch (err) {

    console.error(chalk.red('.lamp-lock.json not found- please make connect call inside root project directory'))
  }

  // we could have one or multiple models/domains to map to the component

  if(typeof models === 'string') models = [ models ]

  // we want to take each property on the domain and expose it 
  // separately as a property inside the return object

   // the complete function should look something like this:

   /*
     const mapStateToProps = ({ Terminator_state }) =>{
      return {
        TerminatorList : Terminator_state.TerminatorList
        isLoading : Terminator_state.isLoading
        SingleTerminator : Terminator_state.SingleTerminator
      }
     }
  */

  let mapStateItems = ''
  let mapStateParams = ''

  models.forEach(model => {

    let reducerFilePath = Structure === 'Ducks' ? `./store/${model}/reducer_for_${model}.js` : 
                        `./store/reducers/reducer_for_${model}.js`

    let file = fs.readFileSync(reducerFilePath).toString();

    const fileAST = parser(file, {sourceType: 'module', plugins: ['jsx']});

    let stateNode

    traverse(fileAST, {
      
      VariableDeclaration(path){
        if(path.node.declarations[0].id.name === 'initialState' || path.node.declarations[0].id.name === stateObject){
          stateNode = path.node
        }
      }
    })

    if(!stateNode){
      console.error(chalk.red('No domain object found for ' + 
        model + 
        '.\nThe state object in the Redux store must be named "initialState", or you can specify the name by appending -s <State Object Name> to the connect call.' 
        + '\nIf your state object names are inconsistent across multiple models/domains, this method wont work.'))
    }

    // so lets build out this part of the total object
    // and in the end we'll combine them into one big object

    let thisModelProps = ''

    stateNode.declarations[0].init.properties.forEach((prop, i, arr)=>{

      thisModelProps += ` ${prop.key.name} : ${model}_state.${prop.key.name},`
    })

    mapStateItems += thisModelProps
    mapStateParams += `${model}_state, `
  })

  mapStateItems = "{" + mapStateItems + "}"

  // using Babel will allow us to append the values in the object as 
  // variables rather than strings

  let mapStateFunction = `const mapStateToProps = ({ ${mapStateParams.slice(0, -2)} }) =>{
      return ${mapStateItems}
     }`

  // console.log(generate(parser(mapStateFunction, {sourceType: 'module'})).code)
  

  // 4. use the action files to generate the mapDispatchtoProps method

  /* 
  for mapDispatchToProps, we will have to build out  
  import statements as well as the method to be inserted
  at the bottom of the file

  getting the action names is pretty straight forward, because
  they will be exported at the bottom

  structure of our implementation based on the Redux docs:
  https://react-redux.js.org/using-react-redux/connect-mapdispatch
  https://codesandbox.io/s/yv6kqo1yw9 

  this method will probably create namespacing collisions if 
  actions are declared identically in separate model/domain files

  I think the user will just have to resolve those
  also, multiple actions could operate on separate slices of the store

  so, makes more sense just to destructure everything and 
  let them sort it out afterwards

  still adds a lot of value I think
  
  first part we want to make:

    import { increment, decrement, reset } from "./actions";

  second part:

    const mapDispatchToProps = dispatch => ({

      decrement: () => dispatch(decrement()),
      increment: () => dispatch(increment()),
      reset: () => dispatch(reset())
    });

  function version of the method allows more flexibility

  */

  let importStatements = []

  let actions = []

  models.forEach(model => {

    let actionFilePath = Structure === 'Ducks' ? `./store/${model}/actions_for_${model}.js` : 
                        `./store/actions/actions_for_${model}.js`

    let file = fs.readFileSync(actionFilePath).toString();

    const fileAST = parser(file, {sourceType: 'module', plugins: ['jsx']});

    let theseActions = []

    traverse(fileAST, {
      ExportDefaultDeclaration(path){

        path.node.declaration.properties.forEach(prop=>{
          
          theseActions.push(prop.key.name)
          actions.push(prop.key.name)
        })
      }
    })

    let relativeFilePath = componentFile.replace(/[^/]/g, "").replace(/[/]/gi, '../')
    importStatements.push(`import { ${theseActions.join(' , ')} } from "${relativeFilePath + actionFilePath.slice(2)}"`)
  })

  const mapDispatchFunction = `const mapDispatchToProps = dispatch => ({
      ${actions.reduce((a,c)=>{

        a += `${c}: () => dispatch( ${c}() ),\n`
        return a
      }, '') }
      
    });`

  // 5. insert everything into the target file

  // the body of the file is accessible as:
  // fileAST.program.body
  // which is an array of nodes

  let theCode = fileAST.program.body

  importStatements.forEach(importStatement => {

    theCode.unshift(parser(importStatement, {sourceType: 'module'} ))
  })

  theCode.splice(theCode.length- 1, 0, parser(mapStateFunction, {sourceType: 'module'}))

  theCode.splice(theCode.length-1, 0, parser(mapDispatchFunction, {sourceType: 'module'}))

  const newCode = generate(fileAST).code;

  const prettifiedCode = prettier.format(newCode, { parser: 'babel' })
  console.log(require('chalk').red(prettifiedCode))

  fs.writeFile(`connected_${componentName}.js`, prettifiedCode, (err) => {
    if (err) throw new Error(err)
  });

}