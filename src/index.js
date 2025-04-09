import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import IndexController from './controllers/index.js';
import PokemonController from './controllers/pokemon.js';
import { config } from './config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = config.port || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Controladores
const indexController = new IndexController();
const pokemonController = new PokemonController();

// Rutas originales
app.get('/', indexController.home);
app.get('/api/resource', indexController.getResource);
app.post('/api/resource', indexController.createResource);

// Rutas para Pokémon
app.get('/api/pokemon', (req, res) => pokemonController.getPokemons(req, res));
app.get('/api/pokemon/search/:query', (req, res) => pokemonController.searchPokemon(req, res));
app.get('/api/pokemon/id/:id', (req, res) => pokemonController.getPokemonById(req, res));
app.get('/api/pokemon/name/:name', (req, res) => pokemonController.getPokemonByName(req, res));

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Prueba la API de Pokémon en: http://localhost:${port}/api/pokemon`);
});