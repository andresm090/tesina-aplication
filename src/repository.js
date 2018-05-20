var Evento = require('../model/Evento');
var Dato = require('../model/Dato');
var Generador = require('../model/Generador');
var Comuna = require('../model/Comuna');

var arrayDirInv = ["N", "NNW", "NW", "WNW", "W", "WSW", "SW", "SSW", "S", "SSE", "SE", "ESE", "E", "ENE", "NE", "NNE"];
//Repositorio para pruebas, no aplica.
var repository = function () {

	this.procesarTopico = function (topic, cb) {

		try {
			var topic_level = topic.split("/");

			var regex = /(\d+)/g;
			var regex2 = /([A-Za-z]+)/g;

			var id_topicG = topic_level[1].match(regex);
			var tipo_variables = topic_level[2];
			var tipo_equipo;

			if (topic_level[1].match(regex2)[0] == 'Ag') {
				tipo_equipo = "aerogenerador";
			} else {
				tipo_equipo = "panel fotovoltaico";
			}
			
			Generador.findOne({'id_topic': id_topicG[0], 'tipo': tipo_equipo, 'activo': true}, (err, generador) => {
				if (err) {
					return null;
				} else {
					Comuna.populate(generador, {path: "comuna"}, (err, generador) => {
						if (err){
							return null;
						}
						cb(generador, tipo_variables);
					});
				}
			});
		} catch (err) {
			console.log ("Topico no valido");
		}
	};

	this.saveEvento = function (value, generador, topic){

		var event = new Evento({
				valor: Number(value),
				topico: topic,
				producedAt: new Date(),
				generador: generador.id, 
			});

		event.save((err) => {
			if (err){
				errores = true;
			}
		});

		if(generador.isAerogenerador()){
			var estado = false;
			if (Number(value) == 1){
				estado = true;
			}

			var actuador = [{
				nombre: generador.actuadores[0]['nombre'],
				tipo: generador.actuadores[0]['tipo'],
				activo: generador.actuadores[0]['activo'],
				re_publica: generador.actuadores[0]['re_publica'],
				topico: generador.actuadores[0]['topico'],
				activado: estado,
			}];

			generador.actuadores = actuador;

			generador.save((err) => {
				if (err){
					errores = true;
					console.log(err);
				}
			});
		}
	};

	this.saveDataPotencias = function (value, generador, topic, cb){

		//V-A-W
		var data = value.split("-");
		var listdata = [];
		var errores = false;

		listdata.push({valor: Number(data[0]), unidad: generador.sensoresP[0]['unidad'], tipo: generador.sensoresP[0]['sufijo']});
		listdata.push({valor: Number(data[1]), unidad: generador.sensoresP[2]['unidad'], tipo: generador.sensoresP[2]['sufijo']});
		listdata.push({valor: Number(data[2]), unidad: generador.sensoresP[1]['unidad'], tipo: generador.sensoresP[1]['sufijo']});

		for (i = 0; i < listdata.length; i++){

			var dato = new Dato({
				valor: listdata[i]['valor'],
				unidad: listdata[i]['unidad'],
				topico: topic,
				producedAt: new Date(),
				generador: generador.id,
				tipo: listdata[i]['tipo'],
				TAG: generador.getTagPotencia(),
			});

			dato.save((err) => {
				if (err){
					errores = true;
				}
			});
		}

		cb(Number(data[0]), Number(data[1]), Number(data[2]), errores);

	};

	this.sacarCuadrante = function (ang){

		var i = Math.round((360 - ang)/22.5);
		if (i >= 16){
			i = 0;
		} 
		return arrayDirInv[i];
	};

	this.saveDataCLimaAero = function (value, generador, topic, cb){

		var data = value.split("-");
		var listdata = [];
		var errores = false;

		//T-v-D
		listdata.push({valor:Number(data[0]), unidad: generador.sensoresC[2]['unidad'], tipo: generador.sensoresC[2]['sufijo']});
		listdata.push({valor:Number(data[1]), unidad: generador.sensoresC[0]['unidad'], tipo: generador.sensoresC[0]['sufijo']});
		listdata.push({valor:Number(data[2]), unidad: generador.sensoresC[1]['unidad'], tipo: generador.sensoresC[1]['sufijo']});

		for (i = 0; i < listdata.length; i++){

			var dato = new Dato({
				valor: listdata[i]['valor'],
				unidad: listdata[i]['unidad'],
				topico: topic,
				producedAt: new Date(),
				generador: generador.id,
				tipo: listdata[i]['tipo'],
				TAG: generador.getTagClima(),
			});

			dato.save((err) => {
				if (err){
					errores = true;
				}
			});
		}

		cb(Number(data[0]), Number(data[1]), Number(data[2]), this.sacarCuadrante(Number(data[2])), errores);
	};

	this.saveDataCLimaPanelF = function (value, generador, topic, cb){

		var data = value.split("-");
		var listdata = [];
		var errores = false;

		//T-R
		listdata.push({valor:Number(data[0]), unidad: generador.sensoresC[1]['unidad'], tipo: generador.sensoresC[1]['sufijo']});
		listdata.push({valor:Number(data[1]), unidad: generador.sensoresC[0]['unidad'], tipo: generador.sensoresC[0]['sufijo']});
		
		for (i = 0; i < listdata.length; i++){

			var dato = new Dato({
				valor: listdata[i]['valor'],
				unidad: listdata[i]['unidad'],
				topico: topic,
				producedAt: new Date(),
				generador: generador.id,
				tipo: listdata[i]['tipo'],
				TAG: generador.getTagClima(),
			});

			dato.save((err) => {
				if (err){
					errores = true;
				}
			});
		}
		
		cb(Number(data[0]), Number(data[1]), errores);
	};
}

module.exports = repository;