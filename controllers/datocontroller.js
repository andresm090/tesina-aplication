var passport = require('passport');
//modelos
var Comuna = require('../model/Comuna');
var Generador = require('../model/Generador');
var Evento = require('../model/Evento');
var Dato = require('../model/Dato');
//gauges 
var gaugeTemp = require('../src/gaugeTemp');
var gaugeVel = require('../src/gaugeVel');
var gaugeVA = require('../src/gaugeVA');
var gaugeWR = require('../src/gaugeWR');
var gaugePira = require('../src/gaugePira');
var gaugeInc = require('../src/gaugeInc');
var gaugeIncSeries = require('../src/gaugeIncSeries');
var statebarPN = require('../src/statebarPN');
var stateVbb = require('../src/stateVbb');
var graphicWindBars = require('../src/graphicWindBars');
var graphicArea = require('../src/graphicArea');
var graphicLine = require('../src/graphicLine');
var graphicWindRose = require('../src/graphicWindRose');
var repo = require('../src/repository');

var repoMara = require('../src/repositoryMara');
var repositoryMara = new repoMara();

var repository = new repo();

/*exports.getfPanelControl = (req, res, next) => {

	Generador.findById(req.params.id, (err, generador) => {
		if (err) {
			return res.send('Ha surgido un error.');
		} else {
			res.locals.user = req.user;
			if (generador.isAerogenerador()){
				Comuna.populate(generador, {path: "comuna"}, (err, generador) => {
					if (err){
						return res.send('No es lo que parece.');
					}
					return res.render('aerogenerador',  {titulo: generador.comuna.nombre + " - " + generador.tipo+" "+generador.caracteristicas[0]['modelo-serie'], id: generador.id});
				});
					
			} else {
				return res.send('No es lo que parece.');
			}
			
		}
	});
};*/

exports.getfPanelControl = (req, res, next) => {

	Generador.findById(req.params.id, (err, generador) => {
		if (err) {
			return res.send('Ha surgido un error.');
		} else {
			res.locals.user = req.user;
			Comuna.populate(generador, {path: "comuna"}, (err, generador) => {
				if (err){
					return res.send('No es lo que parece.');
				}
				return res.render('aerogenerador',  {titulo: generador.comuna.nombre + " - " + generador.tipo+" "+generador.caracteristicas[0]['modelo-serie'], id: generador.id});
			});	
		}
	});
};

exports.getTrCaracteristicas = (req, res, next) => {	

	Generador.findById(req.params.id, (err, generador) => {
		if (err) {
			return res.send('Ha surgido un error.');
		} else {
			return res.render('tr_carac', {caracteristicas: generador.caracteristicas[0], bbaterias: generador.bbaterias[0], sensoresC: generador.sensoresC, sensoresP: generador.sensoresP});
		}

	});
};


exports.getTrDatosTR = (req, res, next) => {	

	Generador.findById(req.params.id, (err, generador) => {
		if (err) {
			return res.send('Ha surgido un error.');
		} else {
			res.locals.user = req.user;
			if (generador.isAerogenerador()){
				return res.render('tr_aero2', {gaugeTemp: gaugeTemp, gaugeVel: gaugeVel, gaugeVA: gaugeVA, gaugeWR: gaugeWR, statebarPN: statebarPN, potenciaN: generador.caracteristicas[0]['potencia'], bbaterias: generador.bbaterias[0], stateVbb: stateVbb, actuador: generador.actuadores[0]['activado'], socketId: generador.id});
			} else {
				Evento.findOne({generador: generador.id}, {}, { sort: { 'createdAt' : -1 } }, function(err, evento) {
					var inc;
					switch(evento.valor) {
						case 60:
							inc = gaugeIncSeries.invierno;
							break;
						case 20:
							inc = gaugeIncSeries.primavera;
							break;
						case 12: 
							inc = gaugeIncSeries.verano;
							break;
						default:
							inc = gaugeIncSeries.otonio;
					}
					return res.render('tr_panelf', {gaugeTemp: gaugeTemp, gaugePira: gaugePira, gaugeVA: gaugeVA, statebarPN: statebarPN, gaugeInc: gaugeInc, potenciaN: generador.caracteristicas[0]['potencia'], bbaterias: generador.bbaterias[0], stateVbb: stateVbb, data: inc, value: evento.valor, socketId: generador.id});
				});
			}
		}

	});
};

exports.getTrPublicacionDatos = (req, res, next) => {	

	Generador.findById(req.params.id, (err, generador) => {
		if (err) {
			return res.send('Ha surgido un error.');
		} else {
			res.locals.user = req.user;
			Comuna.populate(generador, {path: "comuna"}, (err, generador) => {
				if (err){
					return res.send('No es lo que parece.');
				}
				return res.render('tr_publicacion', {generador: generador});
			});
		}

	});
};


exports.getTrDatosH = (req, res, next) => {	

	Generador.findById(req.params.id, (err, generador) => {
		if (err) {
			return res.send('Ha surgido un error.');
		} else {
			res.locals.user = req.user;
			if (generador.isAerogenerador()){
				return res.render('tr_historicos', {clima: 'aerogenerador/clima', energia: 'aerogenerador/energia', datos: 0, id: generador.id});
			}
			return res.render('tr_historicos', {clima: 'fotovoltaica/clima', energia: 'fotovoltaica/energia', datos: 1, id: generador.id});
		}

	});
};

exports.getGrapArea = (req, res, next) => {

	var i = req.body.fechaI;
	var f = req.body.fechaF;
	var media = req.body.media;
	var elemento;

	Dato.find({"producedAt": {"$gte": i, "$lt": f}, "generador": req.params.id, "tipo": req.body.tipo}, {},{ sort: { 'producedAt' : 1 } }, (err, data) => {
		if (req.body.tipo == "T"){
			elemento = {
				grafico: graphicArea,
				titulo: "Temperatura",
				unidad: "C°",
				collapse: 'collapseTem',
				panel: 'panel-danger',
				id: 'containerTemp',
				tipo: 'T' 
			};
		}
		if (req.body.tipo == "Rs"){
			elemento = {
				grafico: graphicArea,
				titulo: "Radiacion solar",
				unidad: "Kw/m²",
				collapse: 'collapseRad',
				panel: 'panel-danger',
				id: 'containerRad',
				tipo: 'Rs'  
			};

			for (d in data) {
				data[d].valor = Number((data[d].valor/1000).toFixed(2));
			}
		}

		if (req.body.tipo == "Vm"){
			elemento = {
				grafico: graphicArea,
				titulo: "Velocidad",
				unidad: "m/s",
				collapse: 'collapseVel',
				panel: 'panel-primary',
				id: 'containervel',
				tipo: 'Vm'    
			};
		}

		if (media == 0) {
			return res.render('graphic_area', {conf: elemento, valores: data});
		} else {
			var minutales = []
			for (i=0; i< data.length; i = i+20) {
				minutales.push(data[i]);
			}
			return res.render('graphic_area', {conf: elemento, valores: minutales});
		}  
	
	});
};

exports.getGrapLine = (req, res, next) => {

	var i = req.body.fechaI;
	var f = req.body.fechaF;
	var media = req.body.media;
	var elemento;

	if (req.body.tipo == "Pg"){

		Dato.find({"producedAt": {"$gte": i, "$lt": f}, "generador": req.params.id, "tipo": req.body.tipo}, {},{ sort: { 'producedAt' : 1 } }, (err, data) => {

			elemento = {
				grafico: graphicLine,
				titulo: "Potencia Generada",
				unidad: "Kwh",
				collapse: 'collapsePg',
				panel: 'panel-warning',
				id: 'containerPg' ,
				tipo: 'Pg'
			};

			if (media == 0) {
				return res.render('graphic_line', {conf: elemento, valores: data});
			} else {

				var minutales = []
				for (i=0; i< data.length; i = i+20) {
					minutales.push(data[i]);
				}

				return res.render('graphic_line', {conf: elemento, valores: minutales});

			}
		});

	} else {

		Dato.find({"producedAt": {"$gte": i, "$lt": f}, "generador": req.params.id, "tipo": 'Ac'}, {},{ sort: { 'producedAt' : 1 } }, (err, data) => {
			Dato.find({"producedAt": {"$gte": i, "$lt": f}, "generador": req.params.id, "tipo": 'Vbb'}, {},{ sort: { 'producedAt' : 1 } }, (err, voltaje) => {
				
				elemento = {
					grafico: graphicLine,
					titulo: "Potencia Consumida",
					unidad: "Kwh",
					collapse: 'collapsePc',
					panel: 'panel-warning',
					id: 'containerPc',
					tipo: 'Ac' 
				};

				for (i = 0; i < data.length; i++){
					data[i].valor = data[i].valor*voltaje[i].valor
				}
				
				if (media == 0) {
					return res.render('graphic_line', {conf: elemento, valores: data});
				} else {
					var minutales = []
					for (i=0; i< data.length; i = i+20) {
						minutales.push(data[i]);
					}

					return res.render('graphic_line', {conf: elemento, valores: minutales});

				}
			});
		});

	}	
}; 

exports.getGrapWIndBar = (req, res, next) => {

	var i = req.body.fechaI;
	var f = req.body.fechaF;
	var media = req.body.media;
	var elemento;
	var datos = [];

	Dato.find({"producedAt": {"$gte": i, "$lt": f}, "generador": req.params.id, "tipo": 'Vm'}, {}, { sort: { 'producedAt' : 1 } }, (err, velocidad) => {

		Dato.find({"producedAt": {"$gte": i, "$lt": f}, "generador": req.params.id, "tipo": 'Dv'}, {}, { sort: { 'producedAt' : 1 } }, (err, direccion) => {
			
			elemento = {
				grafico: graphicWindBars,
				titulo: "Velocidad y direccion de viento",
				collapse: 'collapseVelDir',
				panel: 'panel-primary',
				id: 'containerveldir' 
			};

			for (i = 0; i < velocidad.length; i++){
				var dir = Number(direccion[i].valor) + 180;
				if (dir > 360){
					dir = dir - 360;
				}
				var d = {vel: velocidad[i].valor, 
						dir: dir,
						anio: velocidad[i].producedAt.getFullYear(),
						mes: velocidad[i].producedAt.getMonth(),
						dia: velocidad[i].producedAt.getDate(),
						hora: velocidad[i].producedAt.getHours(),
						min: velocidad[i].producedAt.getMinutes(),
						seg: velocidad[i].producedAt.getSeconds(),
					};
				datos.push(d);
			}

			if (media == 0) {
				return res.render('graphic_windBar', {conf: elemento, datos: datos, fecha: new Date(i)});
			} else {
				var minutales = []
				for (i=0; i< datos.length; i = i+20) {
					minutales.push(datos[i]);
				}

				return res.render('graphic_windBar', {conf: elemento, datos: minutales, fecha: new Date(i)});
			}
		});
	});
};

exports.getWindRose = (req, res, next) => {

	var i = req.body.fechaI;
	var f = req.body.fechaF;
	var data = {
		'N': [],
		'NNE': [],
		'NE': [],
		'ENE': [],
		'E': [],
		'ESE': [],
		'SE': [],
		'SSE': [],
		'S': [],
		'SSW': [],
		'SW': [],
		'WSW': [],
		'W': [],
		'WNW': [],
		'NW': [],
		'NNW': [],
	};

	Dato.find({"producedAt": {"$gte": i, "$lt": f}, "generador": req.params.id, "tipo": 'Vm'}, {}, { sort: { 'producedAt' : 1 } }, (err, velocidad) => {

		Dato.find({"producedAt": {"$gte": i, "$lt": f}, "generador": req.params.id, "tipo": 'Dv'}, {}, { sort: { 'producedAt' : 1 } }, (err, direccion) => {

			var total = velocidad.length;

			for (i = 0; i < velocidad.length; i++){
				j = repository.sacarCuadrante(Number(Math.round(direccion[i].valor)));
				data[j].push(velocidad[i].valor);
			}

			var leyenda = ["&lt; 0.5 m/s", "0.5-2 m/s", "2-4 m/s", "4-6 m/s", "6-8 m/s", "8-10 m/s", "&gt; 10 m/s"];
			var serie = [];
			var cont = {

				'0': 0,
				'1': 0,
				'2': 0,
				'3': 0,
				'4': 0,
				'5': 0,
				'6': 0,
			};

			// Calculamos la frecuencia acumulada para cada sector y armamos arrglos con dichos valores
			for (d in data) {
				for (i = 0; i < data[d].length; i++){
					if (data[d][i] < 0.5){
						cont['0'] = cont['0'] + 1;
					}
					if (data[d][i] >= 0.5 && data[d][i] < 2){
						cont['1'] = cont['1'] + 1;
					}
					if (data[d][i] >= 2 && data[d][i] < 4){
						cont['2'] = cont['2'] + 1;
					}
					if (data[d][i] >= 4 && data[d][i] < 6){
						cont['3'] = cont['3'] + 1;
					}
					if (data[d][i] >= 6 && data[d][i] < 8){
						cont['4'] = cont['4'] + 1;
					}
					if (data[d][i] >= 8 && data[d][i] < 10){
						cont['5'] = cont['5'] + 1;
					}
					if (data[d][i] > 10){
						cont['6'] = cont['6'] + 1;
					}
				}
				data[d] = [];
				for (c in cont){
					data[d].push(Number((cont[c]*100/total).toFixed(2))); 
					cont[c] = 0;
				}

			}

			// Armamos estructura de datos para el grafico.
			// Nota: No funciona tomando de la tabla de la vista.
			for (l in leyenda) {
				valores = [];
				for (d in data){
					var val = [d, data[d][l]];
					valores.push(val);
				}
				serie.push({
					"name": leyenda[l],
					"data": valores, 
				});
			}

			graphicWindRose.series = serie;
			elemento = {
				grafico: graphicWindRose,
				titulo: "Rosa de vientos",
				collapse: 'collapseDir',
				panel: 'panel-info',
				id: 'containerdir' 
			};

			return res.render('graphic_windRose', {conf: elemento, datos: data});

		});
	});
};

exports.getTableEventoGenerador = (req, res, next) => {

	var i = req.body.fechaI;
	var f = req.body.fechaF;
	var elemento;

	Evento.find({"producedAt": {"$gte": i, "$lt": f}, "generador": req.params.id}, {}, { sort: { 'producedAt' : -1 } }, (err, events) => {

		elemento = {
			titulo: "Registro de eventos",
			collapse: 'collapseEvent',
			panel: 'panel-success',
			id: 'containerevent' 
		};

		var options = {  
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		};
		
		if (err){
			return res.render('tb_eventos', {conf: elemento, datos: [], options: options});
		}

		return res.render('tb_eventos', {conf: elemento, datos: events, options: options});

	});


};

exports.precargaDatos = (req, res, next) => {

	Generador.find({'activo': true}, (err, generadores) => {

		var fechaI = new Date (2018, 6, 1, 0, 0, 0);
		var aerogenerador = generadores[0];
		var panelf = generadores[1];


		var vel = [4, 8, 12, 18, 26, 42, 20, 14];
		var dir = [118, 50, 82, 217, 230, 180, 140, 250];
		var temp = [12, 17, 25, 20, 24, 32, 27, 22];
		var vbbA = [12, 24, 36, 40, 38, 32, 24, 20];
		var pgA = [50, 150, 300, 550, 750, 892, 620, 412];
		var acA = [3, 5, 8, 15, 22, 30, 17, 6];
		var rad = [73.8, 112, 180, 252.9, 310, 296, 210, 115];
		var vbbP = [3, 12, 18, 22, 20, 19, 16, 8];
		var pgP = [50, 160, 180, 200, 210, 230, 190, 140];
		var acP = [1.5, 3, 5, 9, 12, 20, 24, 4];

		for (i = 0; i < 10; i++) {
			//console.log("vuelta i: " + i);
			for (j = 0; j < 8; j++) {
				//console.log("vuelta j: " + j);
				var variables = [vel[j], dir[j], temp[j], vbbA[j], pgA[j], acA[j], rad[j], temp[j], vbbP[j], pgP[j], acP[j]];

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

				//repositoryMara.saveDataMasiva(variables, aerogenerador, panel, "mara/global/1/ag1/", fechaI);
				fechaI.setSeconds(fechaI.getSeconds()+30);
				for (k = 0; k < listdata.length; k++){

					var dato = new Dato({
						valor: listdata[k]['valor'],
						unidad: listdata[k]['unidad'],
						topico: "mara/global/1/ag1/",
						producedAt: new Date(fechaI.getFullYear(), fechaI.getMonth(), fechaI.getDate(), fechaI.getHours(), fechaI.getMinutes(), fechaI.getSeconds()),
						generador: listdata[k]['generador'].id,
						tipo: listdata[k]['tipo'],
						TAG: listdata[k]['tag'],
					});

					dato.save((err) => {
						if (err){
							console.log("Error en el guardado de datos");
						}
					});
				}
				//fechaI.setSeconds(fechaI.getSeconds()+30);
				//console.log(fechaI.getSeconds() + " " +fechaI.getHours());

			}

		}

		return res.send('Datos cargados.');
	});

};

// Prueba de generacion de historicos. Solo funciona el de temperatura.
exports.getHistoricos = (req, res, next) => {	

	var graficos = [];
	var elemento;
	// criterios de busqueda para los datos
	var i = req.body.fechaI;
	var f = req.body.fechaF;
	var m = req.body.media;

	Dato.find({"producedAt": {"$gte": i, "$lt": f}, "generador": req.params.id}, (err, data) => {

		if (req.body.temp){
			//var grapic = graphicArea;
			//grapic['title'] = {text:'Temperatura'}; 
			elemento = {
				grafico: graphicArea,
				titulo: "Temperatura",
				unidad: "C°",
				collapse: 'collapseTem',
				panel: 'panel-danger',
				id: 'containerTemp',
				tipo: 'T' 
			};
			graficos.push(elemento);
		}
		if (req.body.vel && req.body.dir ){
			elemento = {
				grafico: graphicWindBars,
				titulo: "Velocidad y direccion de viento",
				collapse: 'collapseVelDir',
				panel: 'panel-primary',
				id: 'containerveldir' 
			};
			graficos.push(elemento);
		} else {
			if (req.body.vel){
				elemento = {
					grafico: graphicWindBars,
					titulo: "Velocidad",
					unidad: "m/s",
					collapse: 'collapseVel',
					panel: 'panel-primary',
					id: 'containervel',
					tipo: 'Vm'  
				};
				graficos.push(elemento);
			} else {
				if (req.body.dir){
					elemento = {
						grafico: graphicWindBars,
						titulo: "Direccion",
						collapse: 'collapseDir',
						panel: 'panel-info',
						id: 'containerdir' 
					};
					graficos.push(elemento);
				}
			}
		}

		if (req.body.rad){
			//graphicArea['title'] = {text:'Radiación Solar'};
			elemento = {
				grafico: graphicArea,
				titulo: "Radiacion solar",
				collapse: 'collapseRad',
				panel: 'panel-danger',
				id: 'containerRad' 
			};
			graficos.push(elemento);
		}

		if (req.body.pg){
			elemento = {
				grafico: graphicLine,
				titulo: "Potencia Generadar",
				unidad: "Kwh",
				collapse: 'collapsePg',
				panel: 'panel-warning',
				id: 'containerPg' ,
				tipo: 'Pg'
			};
			graficos.push(elemento);
		}

		if (req.body.pc){
			elemento = {
				grafico: graphicLine,
				titulo: "Potencia Consumida",
				unidad: "Kwh",
				collapse: 'collapsePc',
				panel: 'panel-warning',
				id: 'containerPc',
				tipo: 'Ac' 
			};
			graficos.push(elemento);
		}

		return res.render('rta_historicos', {graficos: graficos, valores: data});
	});
};