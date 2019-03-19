// this is an action creator boiler plate for the Rail pattern
// separate file for each model

module.exports = (modelName, model) => {

	let modelNameCaps = modelName.toUpperCase()

	let returnStatement = `import actions from "../constants/action_constants"\n`

	let exportStatement = `\nexport default {`


if(!(model.CRUD === false)){


returnStatement += `\nconst get${modelName} = ( payload ) => {

	return {
		type: actions.GET_${modelNameCaps},
		payload
	}
}

const getAll${modelName} = ( payload ) => {

	return {
		type: actions.GET_ALL_${modelNameCaps},
		payload
	}
}

const create${modelName} = ( payload ) => {

	return {

		type: actions.ADD_${modelNameCaps},
		payload
	}
}

const update${modelName} = ( payload ) => {

	return {

		type: actions.UPDATE_${modelNameCaps},
		payload
	}
}

const delete${modelName} = ( payload ) => {

	return {

		type: actions.DELETE_${modelNameCaps},
		payload
	}

}
`

exportStatement += `\n
	get${modelName},
	getAll${modelName},
	create${modelName},
	update${modelName},
	delete${modelName},`

}



if(model.Actions){

	model.Actions.forEach(action => {


		returnStatement += `\nconst ${action} = () => {\n\n}\n`

		exportStatement += "\n\t" + action + ','
	})
}

	return returnStatement + exportStatement + '\n}'
};
