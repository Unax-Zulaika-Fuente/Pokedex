// Variables globales
let currentOffset = 0;
const defaultLimit = 20;
let currentLimit = defaultLimit;
let totalPokemon = 0;
let searchTimeout;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas para detalles
const SEARCH_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días para búsqueda
const CACHE_PREFIX = 'pokedex_';

// Elementos DOM
const pokemonList = document.getElementById('pokemonList');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const prevPageButton = document.getElementById('prevPage');
const nextPageButton = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const limitSelector = document.getElementById('limitSelector');
const pokemonDetail = document.getElementById('pokemonDetail');
const detailContent = document.getElementById('detailContent');
const closeButton = document.querySelector('.close');

// Eliminar la creación de lista de sugerencias
// const suggestionsList = document.createElement('div');
// suggestionsList.className = 'suggestions hidden';
// searchInput.parentNode.appendChild(suggestionsList);

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    preloadSearchData(); // Precarga datos de búsqueda
    fetchPokemonList();
    
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Modificar este evento para búsqueda en tiempo real
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        
        // Limpiar el timeout anterior para evitar muchas peticiones
        clearTimeout(searchTimeout);
        
        // Si el campo está vacío, volver a la lista principal
        if (query.length === 0) {
            currentOffset = 0;
            fetchPokemonList();
            return;
        }
        
        // Esperar 300ms después de que el usuario deje de escribir para buscar
        searchTimeout = setTimeout(() => {
            handleSearch();
        }, 300);
    });
    
    prevPageButton.addEventListener('click', () => navigatePage(-1));
    nextPageButton.addEventListener('click', () => navigatePage(1));
    
    limitSelector.addEventListener('change', () => {
        currentLimit = parseInt(limitSelector.value);
        currentOffset = 0;
        fetchPokemonList();
    });
    
    closeButton.addEventListener('click', () => {
        pokemonDetail.classList.remove('active');
        document.body.classList.remove('modal-open'); // Añadir esta línea
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === pokemonDetail) {
            pokemonDetail.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    });

    setupClearCacheButton();
});

// Funciones de caché del cliente
function saveToCache(key, data, ttl = CACHE_TTL) {
    try {
        const cacheItem = {
            timestamp: Date.now(),
            ttl: ttl,
            data: data
        };
        localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheItem));
    } catch (e) {
        console.warn('Error saving to cache:', e);
    }
}

function getFromCache(key) {
    try {
        const cacheItemJSON = localStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!cacheItemJSON) return null;
        
        const cacheItem = JSON.parse(cacheItemJSON);
        const ttl = cacheItem.ttl || CACHE_TTL; // Usar TTL personalizado o el predeterminado
        
        if (Date.now() - cacheItem.timestamp > ttl) {
            // El caché ha expirado
            localStorage.removeItem(`${CACHE_PREFIX}${key}`);
            return null;
        }
        
        return cacheItem.data;
    } catch (e) {
        console.warn('Error getting from cache:', e);
        return null;
    }
}

// Modificar preloadSearchData para cargar datos reales
async function preloadSearchData() {
    try {
        console.log('Iniciando precarga de datos de búsqueda...');
        
        // Primero verificamos si ya tenemos resultados de búsqueda en caché
        const searchCacheKey = `search_cache`;
        const cachedSearchResults = getFromCache(searchCacheKey);
        
        if (cachedSearchResults) {
            console.log('Datos de búsqueda ya están en caché local');
            return cachedSearchResults;
        }
        
        // Si no hay caché, hacemos una búsqueda simple para obtener algunos resultados
        console.log('Cargando datos de búsqueda iniciales...');
        const response = await fetch(`/api/pokemon/search/a`);
        const results = await response.json();
        
        // Guardar resultados en caché
        saveToCache(searchCacheKey, results, SEARCH_CACHE_TTL);
        
        // Precargar los detalles de los primeros resultados
        console.log('Precargando detalles de pokémon...');
        for (const pokemon of results.slice(0, 20)) {
            const id = extractIdFromUrl(pokemon.url);
            await fetchPokemonDetails(id);
        }
        
        console.log('Precarga de datos completada');
        return results;
    } catch (error) {
        console.error('Error en precarga de datos:', error);
        return [];
    }
}

// Función para obtener detalles de un Pokémon con caché
async function fetchPokemonDetails(id) {
    const cacheKey = `pokemon_${id}`;
    let pokemon = getFromCache(cacheKey);
    
    if (pokemon) {
        console.log(`Pokémon #${id} obtenido de caché local`);
        return pokemon;
    }
    
    console.log(`Obteniendo detalles de Pokémon #${id} del servidor`);
    try {
        const response = await fetch(`/api/pokemon/id/${id}`);
        pokemon = await response.json();
        
        // Guardar en caché
        saveToCache(cacheKey, pokemon);
        saveToCache(`pokemon_name_${pokemon.name.toLowerCase()}`, pokemon);
        
        return pokemon;
    } catch (error) {
        console.error(`Error obteniendo detalles del Pokémon #${id}:`, error);
        throw error;
    }
}

// Funciones
async function fetchPokemonList() {
    try {
        const cacheKey = `list_${currentLimit}_${currentOffset}`;
        const cachedData = getFromCache(cacheKey);
        
        if (cachedData) {
            console.log('Usando lista de Pokémon desde caché local');
            totalPokemon = cachedData.count;
            renderPokemonList(cachedData.results);
            updatePagination();
            return;
        }
        
        console.log('Obteniendo lista de Pokémon del servidor');
        const response = await fetch(`/api/pokemon?limit=${currentLimit}&offset=${currentOffset}`);
        const data = await response.json();
        
        // Guardar en caché
        saveToCache(cacheKey, data);
        
        totalPokemon = data.count;
        renderPokemonList(data.results);
        updatePagination();
    } catch (error) {
        console.error('Error fetching Pokémon list:', error);
        pokemonList.innerHTML = '<p class="error">Error al cargar la lista de Pokémon. Por favor, intenta de nuevo.</p>';
    }
}

// Comentar o eliminar la función fetchSuggestions ya que no la usamos
// async function fetchSuggestions(query) {
//    ...código existente...
// }

async function renderPokemonList(pokemons) {
    pokemonList.innerHTML = '<div class="loading">Cargando Pokémon...</div>';
    
    const pokemonDetails = await Promise.all(
        pokemons.map(async pokemon => {
            const id = extractIdFromUrl(pokemon.url);
            const cacheKey = `pokemon_${id}`;
            
            // Intentar obtener del caché primero
            const cachedPokemon = getFromCache(cacheKey);
            if (cachedPokemon) {
                console.log(`Pokémon #${id} obtenido del caché local`);
                return cachedPokemon;
            }
            
            // Si no está en caché, fetch desde la API
            console.log(`Obteniendo Pokémon #${id} del servidor`);
            const response = await fetch(`/api/pokemon/id/${id}`);
            const data = await response.json();
            
            // Guardar en caché
            saveToCache(cacheKey, data);
            saveToCache(`pokemon_name_${data.name}`, data);
            
            return data;
        })
    );
    
    pokemonList.innerHTML = '';
    
    pokemonDetails.forEach(pokemon => {
        const card = document.createElement('div');
        card.className = 'pokemon-card';
        card.dataset.id = pokemon.id;
        
        const types = pokemon.types.map(typeInfo => {
            return `<span class="type-badge ${typeInfo.type.name}">${typeInfo.type.name}</span>`;
        }).join('');
        
        card.innerHTML = `
            <div class="pokemon-id">#${pokemon.id.toString().padStart(3, '0')}</div>
            <div class="pokemon-name">${pokemon.name}</div>
            <img src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" alt="${pokemon.name}">
            <div class="pokemon-types">${types}</div>
        `;
        
        card.addEventListener('click', () => showPokemonDetails(pokemon.id));
        
        pokemonList.appendChild(card);
    });
}

function extractIdFromUrl(url) {
    const parts = url.split('/');
    return parts[parts.length - 2];
}

function updatePagination() {
    const totalPages = Math.ceil(totalPokemon / currentLimit);
    const currentPage = Math.floor(currentOffset / currentLimit) + 1;
    
    currentPageSpan.textContent = `Página ${currentPage} de ${totalPages}`;
    
    prevPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage === totalPages;
}

function navigatePage(direction) {
    currentOffset = Math.max(0, currentOffset + (direction * currentLimit));
    fetchPokemonList();
}

// Modificar handleSearch para usar el caché optimizado
async function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        currentOffset = 0;
        fetchPokemonList();
        return;
    }
    
    pokemonList.innerHTML = '<div class="loading">Buscando Pokémon...</div>';
    
    try {
        // Buscar en caché local primero (por nombre exacto)
        const nameKey = `pokemon_name_${searchTerm}`;
        const exactMatch = getFromCache(nameKey);
        
        let pokemonToShow = [];
        
        if (exactMatch) {
            console.log(`Pokémon "${searchTerm}" encontrado en caché local`);
            pokemonToShow = [exactMatch];
        } else {
            // Buscar en caché de resultados de búsqueda
            const searchCacheKey = `search_cache`;
            let searchResults = getFromCache(searchCacheKey) || [];
            
            // Filtrar resultados de caché
            const cachedMatches = searchResults.filter(
                p => p.name.toLowerCase().includes(searchTerm)
            );
            
            if (cachedMatches.length > 0) {
                console.log(`Se encontraron ${cachedMatches.length} coincidencias en caché local`);
                
                // Obtener detalles de las coincidencias en caché (max 10)
                pokemonToShow = await Promise.all(
                    cachedMatches.slice(0, 10).map(pokemon => {
                        const id = extractIdFromUrl(pokemon.url);
                        return fetchPokemonDetails(id);
                    })
                );
            } else {
                // Si no hay coincidencias en caché, consultar el servidor
                console.log('No se encontraron coincidencias en caché, consultando servidor...');
                
                // Intenta primero una coincidencia exacta
                try {
                    const exactResponse = await fetch(`/api/pokemon/name/${searchTerm}`);
                    
                    if (exactResponse.ok) {
                        const pokemon = await exactResponse.json();
                        pokemonToShow = [pokemon];
                        
                        // Guardar en caché
                        saveToCache(`pokemon_${pokemon.id}`, pokemon);
                        saveToCache(`pokemon_name_${pokemon.name.toLowerCase()}`, pokemon);
                    }
                } catch (exactError) {
                    console.log('No se encontró coincidencia exacta');
                }
                
                // Si no hay coincidencia exacta, buscar coincidencias parciales
                if (pokemonToShow.length === 0) {
                    const suggestionResponse = await fetch(`/api/pokemon/search/${searchTerm}`);
                    const suggestions = await suggestionResponse.json();
                    
                    if (suggestions.length > 0) {
                        // Actualizar caché de búsqueda
                        saveToCache(searchCacheKey, suggestions, SEARCH_CACHE_TTL);
                        
                        // Obtener detalles
                        pokemonToShow = await Promise.all(
                            suggestions.slice(0, 10).map(pokemon => {
                                const id = extractIdFromUrl(pokemon.url);
                                return fetchPokemonDetails(id);
                            })
                        );
                    }
                }
            }
        }
        
        // Mostrar resultados
        if (pokemonToShow.length > 0) {
            // Mostrar resultados como una lista de pokémon
            pokemonList.innerHTML = '<h2>Resultados de búsqueda:</h2>';
            const resultsDiv = document.createElement('div');
            resultsDiv.className = 'pokemon-grid';
            
            // Renderizar resultados
            pokemonToShow.forEach(pokemon => {
                const card = document.createElement('div');
                card.className = 'pokemon-card';
                card.dataset.id = pokemon.id;
                
                const types = pokemon.types.map(typeInfo => {
                    return `<span class="type-badge ${typeInfo.type.name}">${typeInfo.type.name}</span>`;
                }).join('');
                
                card.innerHTML = `
                    <div class="pokemon-id">#${pokemon.id.toString().padStart(3, '0')}</div>
                    <div class="pokemon-name">${pokemon.name}</div>
                    <img src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" alt="${pokemon.name}">
                    <div class="pokemon-types">${types}</div>
                `;
                
                card.addEventListener('click', () => showPokemonDetails(pokemon.id));
                
                resultsDiv.appendChild(card);
            });
            
            pokemonList.appendChild(resultsDiv);
        } else {
            pokemonList.innerHTML = '<p class="error">No se encontró ningún Pokémon con ese nombre.</p>';
        }
    } catch (error) {
        console.error('Error searching for Pokémon:', error);
        pokemonList.innerHTML = '<p class="error">Error al buscar el Pokémon. Por favor, intenta de nuevo.</p>';
    }
}

// Modificar la función showPokemonDetails para incluir el botón de detalles expandidos

async function showPokemonDetails(id) {
    try {
        const cacheKey = `pokemon_${id}`;
        let pokemon = getFromCache(cacheKey);
        
        if (!pokemon) {
            console.log(`Obteniendo detalles de Pokémon #${id} del servidor`);
            const response = await fetch(`/api/pokemon/id/${id}`);
            pokemon = await response.json();
            
            // Guardar en caché
            saveToCache(cacheKey, pokemon);
            saveToCache(`pokemon_name_${pokemon.name}`, pokemon);
        } else {
            console.log(`Detalles de Pokémon #${id} obtenidos del caché local`);
        }
        
        const types = pokemon.types.map(typeInfo => {
            return `<span class="type-badge ${typeInfo.type.name}">${typeInfo.type.name}</span>`;
        }).join('');
        
        const stats = pokemon.stats.map(statInfo => {
            const statValue = statInfo.base_stat;
            const statPercentage = Math.min(100, (statValue / 255) * 100);
            
            // Añadir nivel para las estadísticas
            const level = Math.floor(statValue / 25) + 1;
            const levelClass = `stat-level-${level}`;
            
            return `
                <div class="stat-item">
                    <div class="stat-header">
                        <span class="stat-name">${statInfo.stat.name.replace('-', ' ')}</span>
                        <span class="stat-value">${statValue}</span>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-fill ${levelClass}" style="width: ${statPercentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');
        
        const abilities = pokemon.abilities.map(abilityInfo => {
            return `<span>${abilityInfo.ability.name.replace('-', ' ')}</span>`;
        }).join(', ');
        
        // Datos adicionales
        const height = (pokemon.height / 10).toFixed(1); // convertir a metros
        const weight = (pokemon.weight / 10).toFixed(1); // convertir a kg
        
        // Obtener especies si está disponible
        let species = '';
        if (pokemon.species && pokemon.species.name) {
            species = pokemon.species.name;
        }
        
        detailContent.innerHTML = `
            <div class="detail-header">
                <h2>${pokemon.name} <span class="pokemon-id-detail">#${pokemon.id.toString().padStart(3, '0')}</span></h2>
                <div class="pokemon-types">${types}</div>
            </div>
            
            <div class="detail-body">
                <div class="detail-image">
                    <img src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" alt="${pokemon.name}">
                </div>
                
                <div class="detail-info">
                    <div class="info-section">
                        <h3>Información básica</h3>
                        <p><span>Altura:</span> <span>${height} m</span></p>
                        <p><span>Peso:</span> <span>${weight} kg</span></p>
                        <p><span>Habilidades:</span> <span>${abilities}</span></p>
                        ${species ? `<p><span>Especie:</span> <span>${species}</span></p>` : ''}
                        <p><span>Experiencia base:</span> <span>${pokemon.base_experience || 'N/A'}</span></p>
                    </div>
                    
                    <div class="info-section">
                        <h3>Estadísticas</h3>
                        <div class="stats">
                            ${stats}
                        </div>
                    </div>
                    
                    <!-- Agregar botón de detalles expandidos -->
                    <div class="expanded-details-btn-container">
                        <button onclick="openExpandedDetails(${pokemon.id})" class="expanded-details-btn">
                            Ver detalles completos
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        pokemonDetail.classList.add('active');
        document.body.classList.add('modal-open');
        
    } catch (error) {
        console.error(`Error fetching Pokémon details for ID ${id}:`, error);
    }
}

// Añadir un botón para limpiar caché si es necesario
function setupClearCacheButton() {
    const footer = document.querySelector('footer');
    const clearCacheBtn = document.createElement('button');
    clearCacheBtn.textContent = 'Limpiar caché';
    clearCacheBtn.className = 'clear-cache-btn';
    clearCacheBtn.addEventListener('click', () => {
        // Limpiar localStorage
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        alert('Caché limpiado correctamente');
        location.reload(); // Recargar para refrescar todo
    });
    footer.appendChild(clearCacheBtn);
}

// Modificar la estructura del modal al crearlo o en el HTML directamente

// Si tu modal está en el HTML, modifícalo así:
/*
<div id="pokemonDetail" class="modal">
    <div class="modal-wrapper">
        <div class="modal-content">
            <span class="close">&times;</span>
            <div id="detailContent"></div>
        </div>
    </div>
</div>
*/

// Si creas el modal dinámicamente en JavaScript, actualiza la estructura:
function createModal() {
    const modal = document.createElement('div');
    modal.id = 'pokemonDetail';
    modal.className = 'modal';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-wrapper';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    
    const detailContent = document.createElement('div');
    detailContent.id = 'detailContent';
    
    content.appendChild(closeBtn);
    content.appendChild(detailContent);
    wrapper.appendChild(content);
    modal.appendChild(wrapper);
    
    document.body.appendChild(modal);
}

// Función para mostrar detalles avanzados del Pokémon
async function showAdvancedDetails(id) {
    try {
        // Preparar datos
        const pokemon = await fetchPokemonDetails(id);
        const speciesResponse = await fetch(`/api/pokemon/species/${id}`);
        const species = await speciesResponse.json();
        
        const evolutionResponse = await fetch(species.evolution_chain.url);
        const evolutionData = await evolutionResponse.json();
        
        // Crear modal si no existe
        let advancedModal = document.getElementById('advancedDetailsModal');
        if (!advancedModal) {
            advancedModal = document.createElement('div');
            advancedModal.id = 'advancedDetailsModal';
            advancedModal.className = 'advanced-modal';
            document.body.appendChild(advancedModal);
        }
        
        // Generar contenido HTML
        advancedModal.innerHTML = `
            <div class="advanced-modal-content">
                <div class="advanced-header">
                    <h2>${pokemon.name} #${pokemon.id.toString().padStart(3, '0')} - Detalles avanzados</h2>
                    <span class="advanced-close">&times;</span>
                </div>
                <div class="advanced-body">
                    <div class="advanced-tabs">
                        <div class="advanced-tab active" data-tab="evolution">Evolución</div>
                        <div class="advanced-tab" data-tab="forms">Formas y Shiny</div>
                        <div class="advanced-tab" data-tab="moves">Movimientos</div>
                        <div class="advanced-tab" data-tab="stats">Estadísticas avanzadas</div>
                        <div class="advanced-tab" data-tab="habitat">Hábitat y detalles</div>
                    </div>
                    
                    <!-- Contenido de pestaña: Evolución -->
                    <div id="evolution" class="tab-content active">
                        <h3>Cadena evolutiva</h3>
                        <div class="evolution-chain" id="evolutionChain">
                            Cargando evoluciones...
                        </div>
                    </div>
                    
                    <!-- Contenido de pestaña: Formas y Shiny -->
                    <div id="forms" class="tab-content">
                        <h3>Formas alternativas y Shiny</h3>
                        <div class="forms-container" id="formsContainer">
                            <div class="form-card">
                                <div class="form-image">
                                    <img src="${pokemon.sprites.front_default}" alt="${pokemon.name} normal">
                                </div>
                                <div class="form-name">Normal</div>
                            </div>
                            ${pokemon.sprites.front_shiny ? `
                            <div class="form-card">
                                <div class="form-image">
                                    <img src="${pokemon.sprites.front_shiny}" alt="${pokemon.name} shiny">
                                </div>
                                <div class="form-name">Shiny</div>
                            </div>` : ''}
                            ${pokemon.sprites.front_female ? `
                            <div class="form-card">
                                <div class="form-image">
                                    <img src="${pokemon.sprites.front_female}" alt="${pokemon.name} female">
                                </div>
                                <div class="form-name">Hembra</div>
                            </div>` : ''}
                            ${pokemon.sprites.front_shiny_female ? `
                            <div class="form-card">
                                <div class="form-image">
                                    <img src="${pokemon.sprites.front_shiny_female}" alt="${pokemon.name} shiny female">
                                </div>
                                <div class="form-name">Shiny Hembra</div>
                            </div>` : ''}
                        </div>
                    </div>
                    
                    <!-- Contenido de pestaña: Movimientos -->
                    <div id="moves" class="tab-content">
                        <h3>Movimientos aprendibles</h3>
                        <p>Este Pokémon puede aprender los siguientes movimientos:</p>
                        <table class="moves-table">
                            <thead>
                                <tr>
                                    <th>Movimiento</th>
                                    <th>Tipo</th>
                                    <th>Método</th>
                                    <th>Nivel</th>
                                </tr>
                            </thead>
                            <tbody id="movesTableBody">
                                <tr><td colspan="4">Cargando movimientos...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Contenido de pestaña: Estadísticas avanzadas -->
                    <div id="stats" class="tab-content">
                        <h3>Estadísticas avanzadas</h3>
                        <div class="advanced-stats-container">
                            <p><strong>Experiencia base:</strong> ${pokemon.base_experience || 'N/A'}</p>
                            <p><strong>Altura:</strong> ${(pokemon.height / 10).toFixed(1)} m</p>
                            <p><strong>Peso:</strong> ${(pokemon.weight / 10).toFixed(1)} kg</p>
                            <p><strong>Especies:</strong> ${species.genera.find(g => g.language.name === 'es')?.genus || species.genera[0]?.genus || 'Desconocido'}</p>
                            
                            <h4>Felicidad base:</h4>
                            <p>${species.base_happiness}</p>
                            
                            <h4>Tasa de captura:</h4>
                            <p>${species.capture_rate}/255</p>
                            
                            <h4>Grupo huevo:</h4>
                            <p>${species.egg_groups.map(g => g.name).join(', ')}</p>
                            
                            <h4>Pasos para la eclosión:</h4>
                            <p>${species.hatch_counter * 255} pasos</p>
                        </div>
                    </div>
                    
                    <!-- Contenido de pestaña: Hábitat -->
                    <div id="habitat" class="tab-content">
                        <h3>Hábitat y detalles adicionales</h3>
                        
                        ${species.habitat ? `<p><strong>Hábitat:</strong> ${species.habitat.name}</p>` : ''}
                        
                        <h4>Descripción:</h4>
                        <p>${getDescription(species)}</p>
                        
                        <h4>Generación:</h4>
                        <p>${species.generation.name.replace('generation-', 'Generación ')}</p>
                        
                        <h4>Tasa de crecimiento:</h4>
                        <p>${species.growth_rate.name}</p>
                        
                        <h4>Forma:</h4>
                        <p>${species.shape?.name || 'Desconocido'}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Mostrar el modal
        advancedModal.classList.add('active');
        document.body.classList.add('modal-open');
        
        // Event listeners para tabs
        const tabs = advancedModal.querySelectorAll('.advanced-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                
                // Desactivar todos los tabs y contenidos
                advancedModal.querySelectorAll('.advanced-tab').forEach(t => t.classList.remove('active'));
                advancedModal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Activar el tab seleccionado y su contenido
                tab.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            });
        });
        
        // Cerrar modal al hacer clic en X
        const closeBtn = advancedModal.querySelector('.advanced-close');
        closeBtn.addEventListener('click', () => {
            advancedModal.classList.remove('active');
            document.body.classList.remove('modal-open');
        });
        
        // Cargar cadena evolutiva
        loadEvolutionChain(evolutionData.chain, advancedModal.querySelector('#evolutionChain'));
        
        // Cargar movimientos
        loadMoves(pokemon.moves, advancedModal.querySelector('#movesTableBody'));
        
    } catch (error) {
        console.error('Error mostrando detalles avanzados:', error);
    }
}

// Función auxiliar para obtener una descripción en español o inglés
function getDescription(species) {
    const spanishEntry = species.flavor_text_entries.find(entry => entry.language.name === 'es');
    if (spanishEntry) return spanishEntry.flavor_text.replace(/\f/g, ' ');
    
    const englishEntry = species.flavor_text_entries.find(entry => entry.language.name === 'en');
    return englishEntry ? englishEntry.flavor_text.replace(/\f/g, ' ') : 'No hay descripción disponible';
}

// Función para cargar cadena evolutiva recursivamente
async function loadEvolutionChain(chain, container) {
    container.innerHTML = '';
    
    try {
        // Función recursiva para procesar la cadena
        async function processChain(chainLink, parentElement, isFirst = true) {
            const species = chainLink.species;
            
            // Obtener ID del Pokémon
            const speciesUrl = species.url;
            const id = extractIdFromUrl(speciesUrl);
            
            // Obtener detalles
            const pokemon = await fetchPokemonDetails(id);
            
            const evolutionStage = document.createElement('div');
            evolutionStage.className = 'evolution-stage';
            
            // Añadir flecha si no es el primero
            if (!isFirst) {
                const arrow = document.createElement('div');
                arrow.className = 'evolution-arrow';
                arrow.innerHTML = '→';
                parentElement.appendChild(arrow);
            }
            
            // Crear elemento para esta evolución
            evolutionStage.innerHTML = `
                <div class="evolution-image">
                    <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
                </div>
                <div class="evolution-name">${pokemon.name}</div>
                <div class="evolution-details">
                    #${pokemon.id.toString().padStart(3, '0')}
                </div>
            `;
            
            parentElement.appendChild(evolutionStage);
            
            // Procesar evoluciones
            if (chainLink.evolves_to && chainLink.evolves_to.length > 0) {
                for (const evolution of chainLink.evolves_to) {
                    await processChain(evolution, parentElement, false);
                }
            }
        }
        
        await processChain(chain, container);
    } catch (error) {
        console.error('Error cargando cadena evolutiva:', error);
        container.innerHTML = '<p>Error al cargar la cadena evolutiva</p>';
    }
}

// Función para cargar movimientos
function loadMoves(moves, tableBody) {
    if (!moves || moves.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">Este Pokémon no tiene movimientos registrados.</td></tr>';
        return;
    }
    
    // Ordenar movimientos por método y luego por nivel
    const sortedMoves = [...moves].sort((a, b) => {
        const methodA = a.version_group_details[0].move_learn_method.name;
        const methodB = b.version_group_details[0].move_learn_method.name;
        
        if (methodA !== methodB) return methodA.localeCompare(methodB);
        
        const levelA = a.version_group_details[0].level_learned_at || 0;
        const levelB = b.version_group_details[0].level_learned_at || 0;
        return levelA - levelB;
    });
    
    // Limitar a 50 movimientos para evitar sobrecarga
    const limitedMoves = sortedMoves.slice(0, 50);
    
    // Función para obtener textos legibles de métodos
    function getReadableMethod(method) {
        switch (method) {
            case 'level-up': return 'Nivel';
            case 'machine': return 'MT/MO';
            case 'egg': return 'Huevo';
            case 'tutor': return 'Tutor';
            default: return method;
        }
    }
    
    // Construir filas de la tabla
    tableBody.innerHTML = limitedMoves.map(move => {
        const details = move.version_group_details[0];
        const method = getReadableMethod(details.move_learn_method.name);
        const level = details.level_learned_at > 0 ? details.level_learned_at : '-';
        
        return `
            <tr>
                <td>${move.move.name.replace('-', ' ')}</td>
                <td><span class="move-type normal">normal</span></td>
                <td>${method}</td>
                <td>${level}</td>
            </tr>
        `;
    }).join('');
    
    // Si hay más de 50 movimientos, añadir nota
    if (moves.length > 50) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" style="text-align: center; font-style: italic;">
            Mostrando 50 de ${moves.length} movimientos
        </td>`;
        tableBody.appendChild(tr);
    }
}

// Función para abrir la vista de detalles expandidos

async function openExpandedDetails(id) {
    try {
        // Cerrar el modal de detalles actual
        pokemonDetail.classList.remove('active');
        
        // Obtener detalles del Pokémon
        const pokemon = await fetchPokemonDetails(id);
        
        // Crear el elemento de vista expandida si no existe
        let expandedView = document.getElementById('expandedView');
        if (!expandedView) {
            expandedView = document.createElement('div');
            expandedView.id = 'expandedView';
            expandedView.className = 'expanded-view';
            document.body.appendChild(expandedView);
        }
        
        // Obtener datos adicionales directamente de la API de Pokémon
        // Esto es una solución alternativa ya que no existe el endpoint en el backend
        let species = {};
        let evolutionChain = {};
        
        try {
            // Intentamos obtener datos de especies
            const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}/`);
            if (speciesRes.ok) {
                species = await speciesRes.json();
                
                // Y si tenemos especies, intentamos obtener la cadena evolutiva
                if (species.evolution_chain && species.evolution_chain.url) {
                    const evolutionRes = await fetch(species.evolution_chain.url);
                    if (evolutionRes.ok) {
                        evolutionChain = await evolutionRes.json();
                    }
                }
            }
        } catch (error) {
            console.error('Error obteniendo datos adicionales:', error);
        }
        
        // Construir HTML para la vista expandida
        const types = pokemon.types.map(typeInfo => {
            return `<span class="type-badge ${typeInfo.type.name}">${typeInfo.type.name}</span>`;
        }).join('');
        
        // Obtener la descripción en español si está disponible
        let description = "Información no disponible";
        if (species.flavor_text_entries) {
            const spanishDesc = species.flavor_text_entries.find(entry => entry.language.name === 'es');
            if (spanishDesc) {
                description = spanishDesc.flavor_text.replace(/\f/g, ' ');
            } else {
                const englishDesc = species.flavor_text_entries.find(entry => entry.language.name === 'en');
                if (englishDesc) {
                    description = englishDesc.flavor_text.replace(/\f/g, ' ');
                }
            }
        }
        
        // Generar HTML para la vista expandida
        expandedView.innerHTML = `
            <div class="expanded-header">
                <div class="expanded-title">
                    <h2>${pokemon.name} #${pokemon.id.toString().padStart(3, '0')}</h2>
                    <div class="pokemon-types">${types}</div>
                </div>
                <span class="expanded-close" onclick="closeExpandedView()">&times;</span>
            </div>
            
            <div class="expanded-content">
                <div class="expanded-tabs">
                    <div class="expanded-tab active" data-tab="profile">Perfil</div>
                    <div class="expanded-tab" data-tab="stats">Estadísticas</div>
                    <div class="expanded-tab" data-tab="moves">Movimientos</div>
                    <div class="expanded-tab" data-tab="evolution">Evolución</div>
                    <div class="expanded-tab" data-tab="forms">Formas</div>
                </div>
                
                <div id="profile" class="tab-panel active">
                    <div class="pokemon-profile">
                        <div class="profile-image">
                            <img src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" alt="${pokemon.name}">
                            <p class="pokemon-description">${description}</p>
                        </div>
                        
                        <div class="profile-info">
                            <h3>Datos básicos</h3>
                            <div class="info-grid">
                                <div class="info-card">
                                    <h4>Físico</h4>
                                    <p><strong>Altura:</strong> ${(pokemon.height / 10).toFixed(1)} m</p>
                                    <p><strong>Peso:</strong> ${(pokemon.weight / 10).toFixed(1)} kg</p>
                                    <p><strong>Forma:</strong> ${species.shape ? species.shape.name : 'Desconocida'}</p>
                                </div>
                                
                                <div class="info-card">
                                    <h4>Entrenamiento</h4>
                                    <p><strong>Exp. Base:</strong> ${pokemon.base_experience || 'N/A'}</p>
                                    <p><strong>Felicidad Base:</strong> ${species.base_happiness || 'N/A'}</p>
                                    <p><strong>Tasa de captura:</strong> ${species.capture_rate || 'N/A'}/255</p>
                                </div>
                                
                                <div class="info-card">
                                    <h4>Reproducción</h4>
                                    <p><strong>Género:</strong> ${species.gender_rate === -1 ? 'Sin género' : 
                                       species.gender_rate === 0 ? '100% Macho' : 
                                       species.gender_rate === 8 ? '100% Hembra' : 
                                      `${(8 - species.gender_rate) * 12.5}% Macho, ${species.gender_rate * 12.5}% Hembra`}</p>
                                    <p><strong>Grupos Huevo:</strong> ${species.egg_groups ? species.egg_groups.map(g => g.name).join(', ') : 'Desconocido'}</p>
                                    <p><strong>Pasos para eclosión:</strong> ${species.hatch_counter ? species.hatch_counter * 255 : 'N/A'}</p>
                                </div>
                                
                                <div class="info-card">
                                    <h4>Habilidades</h4>
                                    <div class="abilities-list">
                                        ${pokemon.abilities.map(ability => 
                                            `<div class="ability-item">${ability.ability.name.replace('-', ' ')}</div>`
                                        ).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="stats" class="tab-panel">
                    <h3>Estadísticas Base</h3>
                    <div class="stats-container">
                        ${pokemon.stats.map(stat => {
                            const statValue = stat.base_stat;
                            const statPercentage = Math.min(100, (statValue / 255) * 100);
                            const level = Math.floor(statValue / 25) + 1;
                            
                            return `
                                <div class="stat-item">
                                    <div class="stat-header">
                                        <span class="stat-name">${stat.stat.name.replace('-', ' ')}</span>
                                        <span class="stat-value">${statValue}</span>
                                    </div>
                                    <div class="stat-bar">
                                        <div class="stat-fill stat-level-${level}" style="width: ${statPercentage}%"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        
                        <div class="stat-total">
                            <div class="stat-header">
                                <span class="stat-name">Total</span>
                                <span class="stat-value">${pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="moves" class="tab-panel">
                    <h3>Movimientos</h3>
                    <p>Este Pokémon puede aprender los siguientes movimientos:</p>
                    
                    <div class="moves-filters">
                        <select id="moveMethodFilter">
                            <option value="all">Todos los métodos</option>
                            <option value="level-up">Por nivel</option>
                            <option value="machine">MT/MO</option>
                            <option value="egg">Huevo</option>
                            <option value="tutor">Tutor</option>
                        </select>
                    </div>
                    
                    <div class="moves-list">
                        ${pokemon.moves.slice(0, 50).map(move => 
                            `<div class="move-item" data-method="${move.version_group_details[0].move_learn_method.name}">
                                ${move.move.name.replace('-', ' ')}
                            </div>`
                        ).join('')}
                        ${pokemon.moves.length > 50 ? 
                            `<div class="move-item more">+${pokemon.moves.length - 50} más...</div>` : 
                            ''}
                    </div>
                </div>
                
                <div id="evolution" class="tab-panel">
                    <h3>Cadena Evolutiva</h3>
                    <div class="evolution-chain" id="evolutionChainContainer">
                        ${!evolutionChain.chain ? 
                            'Información evolutiva no disponible' : 
                            await renderEvolutionChain(evolutionChain.chain)
                        }
                    </div>
                </div>
                
                <div id="forms" class="tab-panel">
                    <h3>Formas Alternativas</h3>
                    <div class="forms-container">
                        <div class="form-card">
                            <div class="form-image">
                                <img src="${pokemon.sprites.front_default}" alt="${pokemon.name} normal">
                            </div>
                            <div class="form-name">Normal</div>
                        </div>
                        
                        ${pokemon.sprites.front_shiny ? 
                            `<div class="form-card">
                                <div class="form-image">
                                    <img src="${pokemon.sprites.front_shiny}" alt="${pokemon.name} shiny">
                                </div>
                                <div class="form-name">Shiny</div>
                            </div>` : ''}
                            
                        ${pokemon.sprites.front_female ? 
                            `<div class="form-card">
                                <div class="form-image">
                                    <img src="${pokemon.sprites.front_female}" alt="${pokemon.name} female">
                                </div>
                                <div class="form-name">Hembra</div>
                            </div>` : ''}
                            
                        ${pokemon.sprites.front_shiny_female ? 
                            `<div class="form-card">
                                <div class="form-image">
                                    <img src="${pokemon.sprites.front_shiny_female}" alt="${pokemon.name} shiny female">
                                </div>
                                <div class="form-name">Shiny Hembra</div>
                            </div>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Mostrar la vista expandida
        expandedView.classList.add('active');
        document.body.classList.add('modal-open');
        
        // Agregar eventos a las pestañas
        const tabs = expandedView.querySelectorAll('.expanded-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Desactivar todos los tabs y paneles
                expandedView.querySelectorAll('.expanded-tab').forEach(t => t.classList.remove('active'));
                expandedView.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                
                // Activar el seleccionado
                tab.classList.add('active');
                const panelId = tab.dataset.tab;
                expandedView.querySelector(`#${panelId}`).classList.add('active');
            });
        });
        
        // Agregar filtro para movimientos
        const moveMethodFilter = expandedView.querySelector('#moveMethodFilter');
        if (moveMethodFilter) {
            moveMethodFilter.addEventListener('change', (e) => {
                const method = e.target.value;
                const moveItems = expandedView.querySelectorAll('.move-item');
                
                moveItems.forEach(item => {
                    if (method === 'all' || item.dataset.method === method) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }
        
    } catch (error) {
        console.error('Error al mostrar detalles expandidos:', error);
    }
}

// Función para renderizar la cadena evolutiva
async function renderEvolutionChain(chain) {
    if (!chain) return 'Información evolutiva no disponible';
    
    try {
        // Obtener datos de la especie para formas alternativas
        const speciesId = extractIdFromUrl(chain.species.url);
        const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${speciesId}/`);
        const speciesData = await speciesResponse.json();
        
        let html = `
            <div class="evolution-stage">
                <div class="evolution-pokemon">
                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${speciesId}.png" 
                         onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png'"
                         alt="${chain.species.name}">
                    <div class="evolution-name">${chain.species.name}</div>
                </div>
            `;
        
        // Añadir formas alternativas (incluyendo megas)
        const varieties = speciesData.varieties.filter(v => !v.is_default);
        
        if (varieties.length > 0) {
            html += `<div class="evolution-forms">`;
            
            for (const variety of varieties) {
                const formId = extractIdFromUrl(variety.pokemon.url);
                try {
                    // Obtener detalles de la forma para verificar si es mega u otra forma especial
                    const formResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${formId}/`);
                    const formData = await formResponse.json();
                    
                    let formName = formData.name.replace(chain.species.name + '-', '');
                    formName = formName.replace('-', ' '); // Mejorar formato del nombre
                    
                    // Determinar si es una megaevolución
                    const isMega = formName.toLowerCase().includes('mega');
                    
                    html += `
                        <div class="evolution-form ${isMega ? 'mega-evolution' : ''}">
                            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${formId}.png" 
                                 onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${formId}.png'"
                                 alt="${formData.name}">
                            <span>${isMega ? '🔶 Mega' : '⭐'} ${formName}</span>
                        </div>
                    `;
                } catch(error) {
                    console.error(`Error obteniendo datos para la forma ${formId}:`, error);
                }
            }
            
            html += `</div>`;
        }
        
        html += `</div>`;
        
        // Procesamiento recursivo de evoluciones
        if (chain.evolves_to && chain.evolves_to.length > 0) {
            html += '<div class="evolution-arrow">→</div>';
            html += '<div class="evolution-next-stages">';
            
            // Procesar cada ramificación evolutiva
            for (const evolution of chain.evolves_to) {
                html += await renderEvolutionChain(evolution);
            }
            
            html += '</div>';
        }
        
        return html;
    } catch(error) {
        console.error("Error al renderizar la cadena evolutiva:", error);
        return `<div class="evolution-error">Error al cargar datos evolutivos</div>`;
    }
}

// Función auxiliar para extraer IDs de las URLs
function extractIdFromUrl(url) {
    const match = url.match(/\/(\d+)\/?$/);
    return match ? match[1] : null;
}

// Función para cerrar la vista expandida
function closeExpandedView() {
    const expandedView = document.getElementById('expandedView');
    if (expandedView) {
        expandedView.classList.remove('active');
    }
    document.body.classList.remove('modal-open');
}