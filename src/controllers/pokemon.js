import pokeApiService from '../services/pokeApi.js';

class PokemonController {
    constructor() {
        // Ya no creamos una nueva instancia, usamos la global
        this.pokeApiService = pokeApiService;
    }

    async getPokemons(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;
            
            const pokemonList = await this.pokeApiService.getPokemonList(limit, offset);
            res.json(pokemonList);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getPokemonById(req, res) {
        try {
            const { id } = req.params;
            const pokemon = await this.pokeApiService.getPokemonById(id);
            res.json(pokemon);
        } catch (error) {
            res.status(404).json({ error: `Pokémon con ID ${req.params.id} no encontrado` });
        }
    }

    async getPokemonByName(req, res) {
        try {
            const { name } = req.params;
            const pokemon = await this.pokeApiService.getPokemonByName(name);
            res.json(pokemon);
        } catch (error) {
            res.status(404).json({ error: `Pokémon con nombre ${req.params.name} no encontrado` });
        }
    }

    async searchPokemon(req, res) {
        try {
            const { query } = req.params;
            const results = await this.pokeApiService.searchPokemon(query);
            res.json(results);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

export default PokemonController;