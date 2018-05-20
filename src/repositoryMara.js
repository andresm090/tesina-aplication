var Evento = require('../model/Evento');
var Dato = require('../model/Dato');
var Generador = require('../model/Generador');
var Comuna = require('../model/Comuna');
var factor = require('../config/factorK');
var gaugeIncSeries = require('../src/gaugeIncSeries');

var arrayDirInv = ["N", "NNW", "NW", "WNW", "W", "WSW", "SW", "SSW", "S", "SSE", "SE", "ESE", "E", "ENE", "NE", "NNE"];

var repositoryMara = function () {

	this.procesarTopicMara = function (topic, cb) {
		try {
			var topic_level = topic.split("/");

			var regex = /(\d+)/g;
			var regex2 = /([A-Za-z]+)/g;

			var id_comuna = topic_level[2].match(regex);
			var id_topicG1 = topic_level[3].match(regex);
			var id_topicG2 = 2
			
			Comuna.findOne({'id_topic': id_comuna[0], 'activo': true}, (err, comuna) => {

				if (err) {
					return null;
				} else {
					Generador.find({'comuna': comuna.id, 'activo': true}, (err, generadores) => {
						if (err) {
							return null;
						} else {
							Comuna.populate(generadores, {path: "comuna"}, (err, generadores) => {
								if (err){
									return null;
								}
								cb(generadores[0], generadores[1]);
							});
						}

					});
				}

			});

		} catch (err){
			console.log ("Topico no valido");
		}
	};

	// Otro esquema de busqueda que asegura la existencia de los generadores.
	this.procesarTopicMara2 = function (topic, cb) {
		try {
			var topic_level = topic.split("/");

			var regex = /(\d+)/g;
			var regex2 = /([A-Za-z]+)/g;

			var id_comuna = topic_level[2].match(regex);
			var id_topicG1 = topic_level[3].match(regex);
			var id_topicG2 = 2
			var tipo_equipo1;
			var tipo_equipo2 = "panel fotovoltaico";
			
			console.log(id_comuna[0]);
			console.log(id_topicG1[0]);
			console.log(id_topicG2);

			if (topic_level[3].match(regex2)[0] == 'ag') {
				tipo_equipo1 = "aerogenerador";
			} else {
				tipo_equipo1 = "panel fotovoltaico";
			}


			Generador.findOne({'id_topic': id_topicG1[0], 'tipo': tipo_equipo1, 'activo': true}, (err, generador1) => {
				if (err) {
					return null;
				} else {
					Comuna.populate(generador1, {path: "comuna"}, (err, generador1) => {
						if (err){
							return null;
						}
						Generador.findOne({'id_topic': id_topicG2, 'tipo': tipo_equipo2, 'activo': true}, (err, generador2) => {
							if (err) {
								return null;
							}
							Comuna.populate(generador2, {path: "comuna"}, (err, generador2) => {
								if (err){
									return null;
								}
								cb (generador1, generador2);
							});
						});

					});
				}
			});
			

		} catch (err){
			console.log ("Topico no valido");
		}
	};

	// Funcion que procesa una trama segun protocolo de aplicacion MARA-V1
	this.porcesarTrama = function (trama, cb){

		var variablesDI = [];
		var variablesAI = [];
		var eventos = [];
		var evento;
		var bytes = trama.match(/.{1,2}/g);
		var DIi = parseInt(bytes[1], 16)+1;
		var cantDI = parseInt(bytes[DIi], 16);

		console.log("Variables digitales:");
		
		for (i = DIi+1; i < cantDI+DIi; i = i+2){
			var valor = bytes[i] + bytes[i+1]
			console.log("	Hexa: " + valor+ " Decimal: "+ parseInt(valor, 16));
			variablesDI.push(parseInt(valor, 16));
		}
		console.log("--------------------------------------");
		var AIi = DIi + cantDI;
		var cantAI = parseInt(bytes[AIi], 16);
		console.log("Variables analogicas:");
		
		var variablesAI = [];
		for (i = AIi+1; i < AIi+cantAI; i= i+2){
			var valor = bytes[i] + bytes[i+1]
			console.log("	Hexa: " + valor+ " Decimal: "+ parseInt(valor, 16));
			variablesAI.push(parseInt(valor, 16));
		}
		console.log("--------------------------------------");
		var Eventi = AIi + cantAI;
		if (parseInt(bytes[Eventi], 16) > 10){
			console.log("Se registra evento");
			var cantEvent = Math.floor(parseInt(bytes[Eventi], 16) /10);

			for (i = 0; i < cantEvent; i++){
				Eventi = Eventi + 1;
				//Obtencion de la dirUC
				var tcd = bytes[Eventi];
				var dirUC;
				if (tcd[0] == '0') {
					dirUC = parseInt(tcd[1], 16);
				} else {
					var aux = parseInt(tcd, 16).toString(2);
					if (aux.length > 6){
						dirUC = "";
						for (k = aux.length-1; k>=aux.length-6; k--){
							dirUC = aux[k] + dirUC;
						}
						dirUC = parseInt(dirUC, 2); 
					} else {
						dirUC = parseInt(aux, 2);
					}
				}

				console.log("	Dir UC: " + dirUC);
				Eventi = Eventi + 1;
				var epb = parseInt(bytes[Eventi], 16).toString(2);
				while (epb.length < 8){
					epb = 0 + epb;
				}
				//console.log("Trama EPB: " + epb);
				console.log("	Estado del evento: "+ epb[0]);
				console.log("	Puerto: "+ parseInt(epb[1]+epb[2]+epb[3],2));
				console.log("	Bit: "+ parseInt(epb[4]+epb[5]+epb[6]+epb[7],2));

				Eventi++;
				var times = [];
				console.log("Timestamp:");
				for (j = Eventi; j<Eventi+6; j++){
					times.push(parseInt(bytes[j], 16));
				}
				console.log("	Anio: " + times[0]);
				console.log("	Mes: " + times[1]);
				console.log("	Dia: " + times[2]);
				console.log("	Hora: " + times[3]);
				console.log("	Minuto: " + times[4]);
				console.log("	Segundo: " + times[5]);
				var timestampNow = new Date();
				var timestamp;
				if ((times[0]+2000) < timestampNow.getFullYear()){
					timestamp = timestampNow;
				} else {
					timestamp = new Date(times[0]+2000, times[1]-1, times[2], times[3], times[4], times[5]);
				}

				console.log(timestamp.toLocaleString());
				console.log("--------------------------------------");
				Eventi = Eventi+7;
				evento = {
					dirUC: dirUC,
					estado: parseInt(epb[0],2),
					puerto: parseInt(epb[1]+epb[2]+epb[3],2),
					bit: parseInt(epb[4]+epb[5]+epb[6]+epb[7],2),
					timestamp: timestamp,
				};
				eventos.push(evento);
			}

		} else {
			console.log("No se registra evento");
		}
		cb (variablesAI, variablesDI, eventos);
	};

	this.saveEventos = function (eventos, aerogenerador, panelf, topic){

		for (i = 0; i < eventos.length; i++){
			if (eventos[i]['bit'] == 0) {
				var event = new Evento({
					valor: eventos[i]['estado'],
					topico: topic,
					producedAt: eventos[i]['timestamp'],
					generador: aerogenerador.id, 
				});

				event.save((err) => {
					if (err){
						errores = true;
					}
				});

				var estado = false;
				if (eventos[i]['estado'] == 1){
					estado = true;
				}

				var actuador = [{
					nombre: aerogenerador.actuadores[0]['nombre'],
					tipo: aerogenerador.actuadores[0]['tipo'],
					activo: aerogenerador.actuadores[0]['activo'],
					re_publica: aerogenerador.actuadores[0]['re_publica'],
					topico: aerogenerador.actuadores[0]['topico'],
					activado: estado,
				}];

				aerogenerador.actuadores = actuador;

				aerogenerador.save((err) => {
					if (err){
						console.log(err);
					}
				});

			} else {

				var event = new Evento({
					valor: eventos[i]['estado'],
					topico: topic,
					producedAt: eventos[i]['timestamp'],
					generador: panelf.id, 
				});

				event.save((err) => {
					if (err){
						errores = true;
					}
				});

			}
			
		}

	};

	this.saveEventoFreno = function (evento, generador, topic) {

		var event = new Evento({
			valor: evento['estado'],
			topico: topic,
			producedAt: evento['timestamp'],
			generador: generador.id, 
		});

		event.save((err) => {
			if (err){
				errores = true;
			}
		});

		var estado = false;
		if (evento['estado'] == 1){
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
				console.log(err);
			}
		});

	};

	this.saveEventoPanel = function (valor, generador, topic, cb){

		var inc;
		var serie;
		switch(valor) {
			case 12:
				inc = factor.inc.i;
				serie = gaugeIncSeries.invierno;
				break;
			case 4:
				inc = factor.inc.p;
				serie = gaugeIncSeries.primavera;
				break;
			case 0: 
				inc = factor.inc.v;
				serie = gaugeIncSeries.verano;
				break;
			default:
				inc = factor.inc.o;
				serie = gaugeIncSeries.otonio;
		}

		Evento.findOne({generador: generador.id}, {}, { sort: { 'createdAt' : -1 } }, function(err, evento) {

			if (err) {

				console.log("Error al recuperar valores de la DB");

			} else {

				if (evento.valor != inc){

					var event = new Evento({
						valor: inc,
						topico: topic+"Ei",
						producedAt: new Date,
						generador: generador.id,
					});

					event.save((err) => {
						if (err){
							console.log(err);
						}
					});

					cb (inc, serie);
				}
			}
		});

	};

	this.sacarCuadrante = function (ang){

		var i = Math.round((360 - ang)/22.5);
		if (i >= 16){
			i = 0;
		} 
		return arrayDirInv[i];
	};

	this.saveData = function (variables, aerogenerador, panelf, topic){

		listdata = [];
		// orden de variables[v, d, temp(Aero), VAg, pgAg, AAg, rad, temp(panel), VPf, PgPf, APf]
		listdata.push({valor: (variables[0]*factor.k.vel).toFixed(2), unidad: aerogenerador.sensoresC[0]['unidad'], tipo: aerogenerador.sensoresC[0]['sufijo'], generador: aerogenerador, tag: aerogenerador.getTagClima()});
		listdata.push({valor: (variables[1]*factor.k.dir).toFixed(2), unidad: aerogenerador.sensoresC[1]['unidad'], tipo: aerogenerador.sensoresC[1]['sufijo'], generador: aerogenerador, tag: aerogenerador.getTagClima()});
		listdata.push({valor: (variables[2]*factor.k.t).toFixed(2), unidad: aerogenerador.sensoresC[2]['unidad'], tipo: aerogenerador.sensoresC[2]['sufijo'], generador: aerogenerador, tag: aerogenerador.getTagClima()});

		listdata.push({valor: (variables[3]*factor.k.vbbA).toFixed(2), unidad: aerogenerador.sensoresP[0]['unidad'], tipo: aerogenerador.sensoresP[0]['sufijo'], generador: aerogenerador, tag: aerogenerador.getTagPotencia()});
		listdata.push({valor: (variables[4]*factor.k.pgA).toFixed(2), unidad: aerogenerador.sensoresP[1]['unidad'], tipo: aerogenerador.sensoresP[1]['sufijo'], generador: aerogenerador, tag: aerogenerador.getTagPotencia()});
		listdata.push({valor: (variables[5]*factor.k.ac).toFixed(2), unidad: aerogenerador.sensoresP[2]['unidad'], tipo: aerogenerador.sensoresP[2]['sufijo'], generador: aerogenerador, tag: aerogenerador.getTagPotencia()});

		listdata.push({valor: (variables[6]*factor.k.rad).toFixed(2), unidad: panelf.sensoresC[0]['unidad'], tipo: panelf.sensoresC[0]['sufijo'], generador: panelf, tag: panelf.getTagClima()});
		listdata.push({valor: (variables[7]*factor.k.t).toFixed(2), unidad: panelf.sensoresC[1]['unidad'], tipo: panelf.sensoresC[1]['sufijo'], generador: panelf, tag: panelf.getTagClima()});

		listdata.push({valor: (variables[8]*factor.k.vbbPf).toFixed(2), unidad: panelf.sensoresP[0]['unidad'], tipo: panelf.sensoresP[0]['sufijo'], generador: panelf, tag: panelf.getTagPotencia()});
		listdata.push({valor: (variables[9]*factor.k.pgPf).toFixed(2), unidad: panelf.sensoresP[1]['unidad'], tipo: panelf.sensoresP[1]['sufijo'], generador: panelf, tag: panelf.getTagPotencia()});
		listdata.push({valor: (variables[10]*factor.k.ac).toFixed(2), unidad: panelf.sensoresP[2]['unidad'], tipo: panelf.sensoresP[2]['sufijo'], generador: panelf, tag: panelf.getTagPotencia()});

		for (i = 0; i < listdata.length; i++){

			var dato = new Dato({
				valor: listdata[i]['valor'],
				unidad: listdata[i]['unidad'],
				topico: topic,
				producedAt: new Date(),
				generador: listdata[i]['generador'].id,
				tipo: listdata[i]['tipo'],
				TAG: listdata[i]['tag'],
			});

			dato.save((err) => {
				if (err){
					console.log("Error en el guardado de datos");
				}
			});
		}

	};

	// Metodo para cargar masiva de datos 

	this.saveDataMasiva = function (variables, aerogenerador, panelf, topic, fecha){

		listdata = [];
		// orden de variables[v, d, temp(Aero), VAg, pgAg, AAg, rad, temp(panel), VPf, PgPf, APf]
		listdata.push({valor: variables[0], unidad: aerogenerador.sensoresC[0]['unidad'], tipo: aerogenerador.sensoresC[0]['sufijo'], generador: aerogenerador, tag: aerogenerador.getTagClima()});
		listdata.push({valor: variables[1], unidad: aerogenerador.sensoresC[1]['unidad'], tipo: aerogenerador.sensoresC[1]['sufijo'], generador: aerogenerador, tag: aerogenerador.getTagClima()});
		listdata.push({valor: variables[2], unidad: aerogenerador.sensoresC[2]['unidad'], tipo: aerogenerador.sensoresC[2]['sufijo'], generador: aerogenerador, tag: aerogenerador.getTagClima()});

		listdata.push({valor: variables[3], unidad: aerogenerador.sensoresP[0]['unidad'], tipo: aerogenerador.sensoresP[0]['sufijo'], generador: aerogenerador, tag: aerogenerador.getTagPotencia()});
		listdata.push({valor: variables[4], unidad: aerogenerador.sensoresP[1]['unidad'], tipo: aerogenerador.sensoresP[1]['sufijo'], generador: aerogenerador, tag: aerogenerador.getTagPotencia()});
		listdata.push({valor: variables[5], unidad: aerogenerador.sensoresP[2]['unidad'], tipo: aerogenerador.sensoresP[2]['sufijo'], generador: aerogenerador, tag: aerogenerador.getTagPotencia()});

		listdata.push({valor: variables[6], unidad: panelf.sensoresC[0]['unidad'], tipo: panelf.sensoresC[0]['sufijo'], generador: panelf, tag: panelf.getTagClima()});
		listdata.push({valor: variables[7], unidad: panelf.sensoresC[1]['unidad'], tipo: panelf.sensoresC[1]['sufijo'], generador: panelf, tag: panelf.getTagClima()});

		listdata.push({valor: variables[8], unidad: panelf.sensoresP[0]['unidad'], tipo: panelf.sensoresP[0]['sufijo'], generador: panelf, tag: panelf.getTagPotencia()});
		listdata.push({valor: variables[9], unidad: panelf.sensoresP[1]['unidad'], tipo: panelf.sensoresP[1]['sufijo'], generador: panelf, tag: panelf.getTagPotencia()});
		listdata.push({valor: variables[10], unidad: panelf.sensoresP[2]['unidad'], tipo: panelf.sensoresP[2]['sufijo'], generador: panelf, tag: panelf.getTagPotencia()});

		for (i = 0; i < listdata.length; i++){

			var dato = new Dato({
				valor: listdata[i]['valor'],
				unidad: listdata[i]['unidad'],
				topico: topic,
				producedAt: fecha,
				generador: listdata[i]['generador'].id,
				tipo: listdata[i]['tipo'],
				TAG: listdata[i]['tag'],
			});

			dato.save((err) => {
				if (err){
					console.log("Error en el guardado de datos");
				}
			});
		}

	};
}

module.exports = repositoryMara;