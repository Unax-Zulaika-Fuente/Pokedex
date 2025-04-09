import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_FILE = path.join(__dirname, '../../.cache/pokemon.json');

// Asegurar que el directorio de caché existe
try {
    fs.mkdirSync(path.join(__dirname, '../../.cache'), { recursive: true });
} catch (error) {
    // Directorio ya existe o no se puede crear
}

class PokeApiService {
    constructor() {
        this.baseUrl = 'https://pokeapi.co/api/v2';
        this.pokemonCache = []; // Caché para lista de pokémon
        this.pokemonDetailsCache = {}; // Caché para detalles de pokémon
        this.lastCacheUpdate = 0;
        this.searchCacheUpdate = 0;
        this.cacheTTL = 24 * 60 * 60 * 1000; // 24 horas para detalles
        this.searchCacheTTL = 7 * 24 * 60 * 60 * 1000; // 7 días para búsqueda
        
        // Cargar caché desde archivo
        this.loadCacheFromFile();
    }
    
    // Cargar caché desde archivo
    loadCacheFromFile() {
        try {
            if (fs.existsSync(CACHE_FILE)) {
                const data = fs.readFileSync(CACHE_FILE, 'utf8');
                const cache = JSON.parse(data);
                
                if (cache.timestamp && (Date.now() - cache.timestamp) < this.searchCacheTTL) {
                    console.log('Cargando caché de búsqueda desde archivo');
                    this.pokemonCache = cache.pokemonList || [];
                    this.pokemonDetailsCache = cache.pokemonDetails || {};
                    this.lastCacheUpdate = cache.timestamp;
                    this.searchCacheUpdate = cache.timestamp;
                    return;
                }
            }
            
            console.log('No se encontró caché válido, se inicializará desde la API');
            this.initSearchCache();
        } catch (error) {
            console.error('Error cargando caché desde archivo:', error);
            this.initSearchCache();
        }
    }
    
    // Guardar caché a archivo
    saveCacheToFile() {
        try {
            const cacheData = {
                timestamp: Date.now(),
                pokemonList: this.pokemonCache,
                pokemonDetails: this.pokemonDetailsCache
            };
            
            fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData));
            console.log('Caché guardado en archivo');
        } catch (error) {
            console.error('Error guardando caché a archivo:', error);
        }
    }
    
    // Inicializar caché
    async initSearchCache() {
        try {
            console.log('Inicializando caché de búsqueda desde la API');
            await this.loadFullPokemonList();
        } catch (error) {
            console.error('Error inicializando caché de búsqueda:', error);
        }
    }
    
    // Cargar lista completa
    async loadFullPokemonList() {
        try {
            console.log('Cargando lista completa de Pokémon...');
            // Primero obtenemos el conteo total
            const countResponse = await axios.get(`${this.baseUrl}/pokemon?limit=1`);
            const totalCount = countResponse.data.count;
            
            // Ahora solicitamos todos con un solo request
            const response = await axios.get(`${this.baseUrl}/pokemon?limit=${totalCount}`);
            this.pokemonCache = response.data.results;
            this.searchCacheUpdate = Date.now();
            
            // Guardar caché a archivo
            this.saveCacheToFile();
            
            console.log(`Caché de búsqueda cargado con ${this.pokemonCache.length} Pokémon`);
        } catch (error) {
            console.error('Error cargando lista completa de Pokémon:', error);
            throw error;
        }
    }

    async getPokemonList(limit = 20, offset = 0) {
        // Clave única para esta consulta específica
        const cacheKey = `list_${limit}_${offset}`;
        
        // Comprobar si tenemos esta consulta en caché
        if (this.pokemonDetailsCache[cacheKey] && 
            (Date.now() - this.lastCacheUpdate) < this.cacheTTL) {
            console.log('Usando caché de lista de Pokémon');
            return this.pokemonDetailsCache[cacheKey];
        }

        try {
            console.log('Obteniendo lista de Pokémon de la API');
            const response = await axios.get(`${this.baseUrl}/pokemon`, {
                params: { limit, offset }
            });
            
            // Guardar en caché
            this.pokemonDetailsCache[cacheKey] = response.data;
            this.lastCacheUpdate = Date.now();
            
            return response.data;
        } catch (error) {
            console.error('Error fetching Pokemon list:', error);
            throw error;
        }
    }

    async getPokemonById(id) {
        // Comprobar si ya tenemos este Pokémon en caché
        if (this.pokemonDetailsCache[`pokemon_${id}`] && 
            (Date.now() - this.lastCacheUpdate) < this.cacheTTL) {
            console.log(`Usando caché para Pokémon ID: ${id}`);
            return this.pokemonDetailsCache[`pokemon_${id}`];
        }

        try {
            console.log(`Obteniendo Pokémon ID: ${id} de la API`);
            const response = await axios.get(`${this.baseUrl}/pokemon/${id}`);
            
            // Guardar en caché
            this.pokemonDetailsCache[`pokemon_${id}`] = response.data;
            // También cachear por nombre para búsquedas futuras
            this.pokemonDetailsCache[`pokemon_name_${response.data.name.toLowerCase()}`] = response.data;
            this.lastCacheUpdate = Date.now();
            
            return response.data;
        } catch (error) {
            console.error(`Error fetching Pokemon with ID ${id}:`, error);
            throw error;
        }
    }

    async getPokemonByName(name) {
        const normalizedName = name.toLowerCase();
        
        // Comprobar si ya tenemos este Pokémon en caché
        if (this.pokemonDetailsCache[`pokemon_name_${normalizedName}`] && 
            (Date.now() - this.lastCacheUpdate) < this.cacheTTL) {
            console.log(`Usando caché para Pokémon: ${name}`);
            return this.pokemonDetailsCache[`pokemon_name_${normalizedName}`];
        }

        try {
            console.log(`Obteniendo Pokémon: ${name} de la API`);
            const response = await axios.get(`${this.baseUrl}/pokemon/${normalizedName}`);
            
            // Guardar en caché
            this.pokemonDetailsCache[`pokemon_name_${normalizedName}`] = response.data;
            this.pokemonDetailsCache[`pokemon_${response.data.id}`] = response.data;
            this.lastCacheUpdate = Date.now();
            
            return response.data;
        } catch (error) {
            console.error(`Error fetching Pokemon with name ${name}:`, error);
            throw error;
        }
    }

    async searchPokemon(searchTerm) {
        try {
            // Si la cache está vacía o ha expirado, obtener lista completa
            if (this.pokemonCache.length === 0) {
                await this.loadFullPokemonList();
            }

            // Buscar coincidencias parciales (más eficiente)
            const normalizedTerm = searchTerm.toLowerCase();
            const matches = this.pokemonCache.filter(pokemon => 
                pokemon.name.toLowerCase().includes(normalizedTerm)
            );

            console.log(`Búsqueda de "${searchTerm}" encontró ${matches.length} resultados desde caché`);
            
            // Cargar previamente los detalles de los primeros resultados
            const topResults = matches.slice(0, 10);
            
            // Pre-cargar los detalles en caché para ahorrar peticiones futuras
            for (const pokemon of topResults) {
                const id = this.extractIdFromUrl(pokemon.url);
                // Solo cargar si no está en caché
                if (!this.pokemonDetailsCache[`pokemon_${id}`]) {
                    this.getPokemonById(id).catch(() => {});  // Ignorar errores
                }
            }
            
            return topResults;
        } catch (error) {
            console.error('Error searching for Pokemon:', error);
            throw error;
        }
    }
    
    // Método auxiliar para extraer ID de una URL
    extractIdFromUrl(url) {
        const parts = url.split('/');
        return parts[parts.length - 2];
    }
    
    // Método para limpiar caché cuando sea necesario
    clearCache() {
        this.pokemonCache = [];
        this.pokemonDetailsCache = {};
        this.lastCacheUpdate = 0;
        console.log('Caché limpiado');
    }
}

// Crear una instancia global para mantener el caché entre solicitudes
const pokeApiServiceInstance = new PokeApiService();

export default pokeApiServiceInstance;