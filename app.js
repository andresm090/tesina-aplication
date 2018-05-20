global.config = require('./config/config');

var express = require('express');
var flash = require('connect-flash');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var passportConfig = require('./config/passport');
var mongoStore = require('connect-mongo')(session);
var mongoose = require('mongoose');
var swig = require('swig');
var index = require('./routes/index');
var users = require('./routes/users');
var mqtt = require('./src/serverMQTT');
var repoMara = require('./src/repositoryMara');
var controllerUser = require('./controllers/usercontroller');
var autoNumber = require('mongoose-auto-number');
var factor = require('./config/factorK');
var Trama = require('./model/Trama');

var MONGO_URL = 'mongodb://'+global.config.db.host+':'+global.config.db.port+'/'+global.config.db.database;

//var http = require('http').Server(app);
var io = require('socket.io').listen(global.config.socket.port);

var connectionsArray = []; // Arreglo de socket
var serverMQTT = new mqtt();
var repositoryMara = new repoMara();
var swig = new swig.Swig();

var app = express();

//Configuracion de la base de datos
mongoose.Promise = global.Promise;
mongoose.connect(MONGO_URL);
mongoose.connection.on('error', (err) => {
	throw err;
	process.exit(1);
});

autoNumber.init(mongoose.connection);

//Configuracion para manejo de sesiones
app.use(session ({
	secret: global.config.session.password,
	resave: global.config.session.resave,
	saveUninitialized: global.config.session.saveUninitialized,
	store: new mongoStore({
		url: MONGO_URL,
		autoReconnect: global.config.db.autoReconnect
	})
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(flash());


// view engine setup
app.engine('html', swig.renderFile);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(cookieParser());
app.use('*/public',express.static('public'));


//Ruta de prueba - Recupera informacion de un usuario
app.get('/userinfo', passportConfig.isAuthenticate, (req, res) => {
	res.json(req.user);
});

//Definicion de los manejadores de rutas
app.use('/', index);
app.use('/users', users);

// funcion principal para el manejo de los msj provenientes del Broker. 
serverMQTT.connect(function(clientMQTT) {
	
	clientMQTT.subscribe('mara/global/+/+/'); // Topico generico
	serverMQTT.observer(function(topic, value) {
		console.log("Topico:");
		console.log(topic);
		console.log("--------------------------------------");
		console.log("Trama:");
		console.log(value.toString());
		var trama = new Trama({
			trama: value.toString(),
			topico: topic 
		});
		trama.save();
		repositoryMara.procesarTopicMara(topic, function(aerogenerador, panelf){
			repositoryMara.porcesarTrama(value.toString(), function(variables, variablesDi, eventos){
				// orden de variables[vel, d, temp(Aero), VAg, pgAg, AAg, rad, temp(panel), VPf, PgPf, APf]
				repositoryMara.saveData(variables, aerogenerador, panelf, topic);

				var vel = Number((variables[0]*factor.k.vel).toFixed(2));
				var dir = Number((variables[1]*factor.k.dir).toFixed(2));
				var tempA = Number((variables[2]*factor.k.t).toFixed(2));
				var vbbA = Number((variables[3]*factor.k.vbbA).toFixed(2));
				var pgA = Number((variables[4]*factor.k.pgA).toFixed(2));
				var acA = Number((variables[5]*factor.k.ac).toFixed(2));
				var rad = Number((variables[6]*factor.k.rad).toFixed(2));
				var tempP = Number((variables[7]*factor.k.t).toFixed(2));
				var vbbP = Number((variables[8]*factor.k.vbbPf).toFixed(2));
				var pgP = Number((variables[9]*factor.k.pgPf).toFixed(2));
				var acP = Number((variables[10]*factor.k.ac).toFixed(2));

				if (aerogenerador.actuadores[0]['activado']){
					pgA = 0;
				}
				//Notifico a los clientes
				connectionsArray.forEach(function(tmpSocket) {
					tmpSocket.emit(aerogenerador.id+'/p', vbbA, acA, pgA);
					tmpSocket.emit(panelf.id+'/p', vbbP, acP, pgP);
					tmpSocket.emit(aerogenerador.id+'/c', tempA, vel, dir, repositoryMara.sacarCuadrante(dir));
					tmpSocket.emit(panelf.id+'/c', tempP, rad);

					repositoryMara.saveEventoPanel(variablesDi[0], panelf, topic, function(inc, serie){
						tmpSocket.emit('mapComuna/i', panelf.comuna.id, panelf.id);
						tmpSocket.emit(panelf.id+'/e', serie, inc);
						if (panelf.actuadores[0]['re_publica']){
							clientMQTT.publish("C"+panelf.comuna.id_topic+"/"+panelf.sufijo+panelf.id_topic+"/"+panelf.actuadores[0]['topico'], inc + "°");
						}

					});
				});

				// republicacion de variables de energia aerogenerador
				if (aerogenerador.sensoresP[0]['re_publica']){
					clientMQTT.publish("C"+aerogenerador.comuna.id_topic+"/"+aerogenerador.sufijo+aerogenerador.id_topic+"/"+aerogenerador.sensoresP[0]['topico'], vbbA.toString());
				}
				if (aerogenerador.sensoresP[1]['re_publica']){
					clientMQTT.publish("C"+aerogenerador.comuna.id_topic+"/"+aerogenerador.sufijo+aerogenerador.id_topic+"/"+aerogenerador.sensoresP[1]['topico'], pgA.toString());
				}
				if (aerogenerador.sensoresP[2]['re_publica']){
					var consumo = vbbA*acA;
					clientMQTT.publish("C"+aerogenerador.comuna.id_topic+"/"+aerogenerador.sufijo+aerogenerador.id_topic+"/"+aerogenerador.sensoresP[2]['topico'], consumo.toString());
				}

				// republicacion de variables de energia panel fotovoltaico
				if (panelf.sensoresP[0]['re_publica']){
					clientMQTT.publish("C"+panelf.comuna.id_topic+"/"+panelf.sufijo+panelf.id_topic+"/"+panelf.sensoresP[0]['topico'], vbbP.toString());
				}
				if (panelf.sensoresP[1]['re_publica']){
					clientMQTT.publish("C"+panelf.comuna.id_topic+"/"+panelf.sufijo+panelf.id_topic+"/"+panelf.sensoresP[1]['topico'], pgP.toString());
				}
				if (panelf.sensoresP[2]['re_publica']){
					var consumo = vbbP*acP;
					clientMQTT.publish("C"+panelf.comuna.id_topic+"/"+panelf.sufijo+panelf.id_topic+"/"+panelf.sensoresP[2]['topico'], consumo.toString());
				}

				// republicacion de variables de climaticas aerogenerador
				if (aerogenerador.sensoresC[0]['re_publica']){
					clientMQTT.publish("C"+aerogenerador.comuna.id_topic+"/"+aerogenerador.sufijo+aerogenerador.id_topic+"/"+aerogenerador.sensoresC[0]['topico'], vel.toString());
				}
				if (aerogenerador.sensoresC[1]['re_publica']){
					clientMQTT.publish("C"+aerogenerador.comuna.id_topic+"/"+aerogenerador.sufijo+aerogenerador.id_topic+"/"+aerogenerador.sensoresC[1]['topico'], dir.toString()+"° - "+repositoryMara.sacarCuadrante(dir));
				}
				if (aerogenerador.sensoresC[2]['re_publica']){
					clientMQTT.publish("C"+aerogenerador.comuna.id_topic+"/"+aerogenerador.sufijo+aerogenerador.id_topic+"/"+aerogenerador.sensoresC[2]['topico'], tempA.toString());
				}

				// republicacion de variables de climaticas panel fotovoltaico
				if (panelf.sensoresC[0]['re_publica']){
					clientMQTT.publish("C"+panelf.comuna.id_topic+"/"+panelf.sufijo+panelf.id_topic+"/"+panelf.sensoresC[0]['topico'], rad.toString());
				}
				if (panelf.sensoresC[1]['re_publica']){
					clientMQTT.publish("C"+panelf.comuna.id_topic+"/"+panelf.sufijo+panelf.id_topic+"/"+panelf.sensoresC[1]['topico'], tempP.toString());
				}

				for (i = 0; i < eventos.length; i++){
					if (eventos[i]['bit'] == 0) {
						repositoryMara.saveEventoFreno(eventos[i], aerogenerador, topic);
						connectionsArray.forEach(function(tmpSocket) {
							tmpSocket.emit('mapComuna/e', eventos[i]['estado'], aerogenerador.comuna.id);
							tmpSocket.emit(aerogenerador.id+'/e', eventos[i]['estado']);
						});

						if (aerogenerador.actuadores[0]['re_publica']){
							var estate = eventos[i]['estado'];
							clientMQTT.publish("C"+aerogenerador.comuna.id_topic+"/"+aerogenerador.sufijo+aerogenerador.id_topic+"/"+aerogenerador.actuadores[0]['topico'], estate.toString());
						}
					} 
				}
			});
		});
		
	});
});

//coneccion de los websocket
io.on('connection', function(socket){
	console.log('Numero de conexión:' + connectionsArray.length); 

	socket.on('disconnect', function(){
		var socketIndex = connectionsArray.indexOf(socket);
		console.log('socketID = %s got disconnected', socketIndex);
		if (~socketIndex) {
			connectionsArray.splice(socketIndex, 1);
	    }
	});
 
 	console.log('Nuevo Socket conectado!');
 	connectionsArray.push(socket);
});


//Captura el status 404 y renderiza a la vista correspondiente
app.use(function(req, res, next) {
  //res.status(404).send('Sorry cant find that!');
  res.locals.user = req.user;
  res.status(404).render('404');
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
