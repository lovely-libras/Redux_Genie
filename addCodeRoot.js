module.exports = (commandLine) => {

	/*
		strategy:
		convert the input into a Model, feed that model in to the 
		diffing function as the current model, then 
		run update with the result of that function call

		otherwise, someone might call add with the
		same input a bunch of times and there'd
		be no way to stop it
	
		for add model- takes current yaml and simply appends new model

		for add action/ add thunk - takes current yaml, traverses to find
		the specific model, then appends to existing
	*/

	const addCall = require('minimist')(commandLine)

	// extract and validate command input

	const existingModel = addCall.model || addCall.Model || addCall.m || addCall.MODEL

	if(Array.isArray(existingModel)){

		console.error(require('chalk').yellow('ERROR: can only edit one model at a time. Please run consecutive calls for', existingModel.join(' and ')))
	} 

	const newModel = addCall.newModel || addCall.newmodel || addCall.M || addCall.NEWMODEL
	let definedThunks = addCall.thunks || addCall.Thunks || addCall.t
	let definedActions = addCall.actions || addCall.Actions || addCall.a
	const noCrud = addCall.nocrud || addCall.noCrud || addCall.noCRUD || addCall.NOCRUD

	// this is processed with command line input
	// to the update code root as the new "current" yam
	
	let newCurrent = require('./lock').returnPrevious()
	
	// new model call
	if(newModel){

		newCurrent.Models.forEach(model => {

			const oldModelName = Object.keys(model)[0]

			const capitalizedOldModelName = oldModelName[0].toUpperCase().concat(oldModelName.slice(1))
			
			if( oldModelName === newModel || capitalizedOldModelName === newModel ){

				console.error(require('chalk').yellow('ERROR: Model', newModel, 'already defined'))
				process.exit()
			}
		})

		const modelObject = { [newModel] : null,
							  Slice: [ { State: 'string'}],
							  Actions: [  ],
							  Thunks: [ ]
							}

		if(noCrud){
			modelObject.CRUD = false
		}
		
		if(definedThunks){
			// console.deep(definedThunks)
			Array.isArray(definedThunks) ? modelObject.Thunks.push(...definedThunks) : modelObject.Thunks.push(definedThunks) ;

		}

		if(definedActions){
			// console.deep(definedActions)
			Array.isArray(definedActions) ? modelObject.Actions.push(...definedActions) : modelObject.Actions.push(definedActions) ;
		}

		newCurrent.Models.push(modelObject)

	}

	// add to model call

	if(existingModel){

		// find the model they want to update
		// have to search for both the previous model and previous model capitalized

		let thisModel 

		newCurrent.Models.forEach(model => {

			const currentModelName = Object.keys(model)[0]
			const capitalizedModelName = currentModelName[0].toUpperCase().concat(currentModelName.slice(1))
			
			if( currentModelName === existingModel || capitalizedModelName === existingModel ){

				thisModel = model
			}

		})
		
		if(definedThunks){

			// filter for Thunks that already exist on the model, then push to the model list

			const currentThunks = thisModel.Thunks.reduce((a,b) => { a.push(...Object.keys(b)); return a } , [])
			
			if(Array.isArray(definedThunks)){

				// have to convert the current model thunks to an array of just each thunk's names
				definedThunks = definedThunks.filter(thunk =>  !currentThunks.includes(thunk) )
				definedThunks = definedThunks.map(thunk => { return { [thunk] : ['blank', 'blank']} } )

				thisModel.Thunks.push(...definedThunks)

			}
			else{

				definedThunks = { [definedThunks] : ['null', 'null']}

				!currentThunks.includes(definedThunks) ? thisModel.Thunks.push(definedThunks) : console.log('Thunk ', definedThunks, 'is already defined on', currentModelName)
			}
		}

		if(definedActions){

			// filter for Thunks that already exist on the model, then push to the model list
	
			if(Array.isArray(definedActions)){

				// have to convert the current model thunks to an array of just each thunk's names
				definedActions = definedActions.filter(thunk =>  !thisModel.Actions.includes(thunk) )

				thisModel.Actions.push(...definedActions)

			}
			else{

				!currentThunks.includes(definedActions) ? thisModel.Actions.push(definedActions) : console.log('Action ', definedActions, 'is already defined on', currentModelName)
			}
		}


	}

	return require('./lock').diffLock(newCurrent)
}

/*

To add a new model

	genie add --newmodel Terminator

	can also add actions in new model call 

	genie add --newmodel Terminator -a getIsBack -a killJohnConnor 

	without CRUD ops

	genie add --newmodel Terminator -a getIsBack --noCRUD

To add an action to specific model

	genie add --action getIsBack -model Terminator 
		
		... or abbreviated 
	genie add -a getIsBack -m Terminator

To add a thunk to a specific model

	genie add --thunk countDux --model Dux
	
		... or
	genie add -t countDux -m Dux

To add a connected React component

	genie add --connected DuckPond --model Dux -model Ducklings

	the component will be created with connections to each model's slice of the store


{ dux: null,
         Slice:
          [ { Name: 'string' },
            { Quacking: 'Boolean' },
            { Ducklings: 'Object' },
            { Fly2Gether: 'Boolean' },
            [length]: 4 ],
         Actions: [ 'countDux', 'migrateDux', 'quackOne', [length]: 3 ],
         Thunks:
          [ { getAll: [ '/api/Dux', 'countDux', [length]: 2 ] },
            { getOne: [ '/api/Dux/:dux', 'migrateDux', [length]: 2 ] },
            [length]: 2 ] },
       { Ducklings: null,
         Slice: [ { Name: 'string' }, [length]: 1 ],
         Actions:
          [ 'countDucklings', 'migrateDucklings', 'quackOne', [length]: 3 ],
         Thunks:
          [ { getAll: [ '/api/Dux', 'countDucklings', [length]: 2 ] },
            { getOne: [ '/api/Dux/:dux', 'migrateDucklings', [length]: 2 ] },
            [length]: 2 ] },
       [length]: 2 ] }




{ addedModels: [ [length]: 0 ],
    modelUpdates:
     [ [ 0, 'Actions', [ '+', 'migrateDux', [length]: 2 ], [length]: 3 ],
       [ 0,
         'Thunks',
         [ '+',
           { getOne: [ '/api/Dux/:dux', 'migrateDux', [length]: 2 ] },
           [length]: 2 ],
         [length]: 3 ],
       [ 1,
         'Actions',
         [ '+', 'migrateDucklings', [length]: 2 ],
         [length]: 3 ],
       [ 1, 'Actions', [ '+', 'quackOne', [length]: 2 ], [length]: 3 ],
       [ 1,
         'Thunks',
         [ '+',
           { getAll: [ '/api/Dux', 'countDucklings', [length]: 2 ] },
           [length]: 2 ],
         [length]: 3 ],
       [ 1,
         'Thunks',
         [ '+',
           { getOne: [ '/api/Dux/:dux', 'migrateDucklings', [length]: 2 ] },
           [length]: 2 ],
         [length]: 3 ],
       [length]: 6 ] }


*/