// Control de la animación de carga inicial con secuencia interactiva
document.addEventListener('DOMContentLoaded', () => {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const pokeball = document.querySelector('.pokeball');
    const pokeballTop = document.querySelector('.pokeball-top');
    const pokeballBottom = document.querySelector('.pokeball-bottom');
    const pokedexTopHalf = document.querySelector('.pokedex-top-half');
    const pokedexBottomHalf = document.querySelector('.pokedex-bottom-half');
    const loadingText = document.querySelector('.loading-text');
    
    // Verificar si los elementos existen
    console.log("pokedexTopHalf:", pokedexTopHalf);
    console.log("pokedexBottomHalf:", pokedexBottomHalf);
    
    // Aplicar vibración suave inmediatamente desde el principio
    pokeball.classList.add('shake-effect');
    
    // Eliminar texto inicial - dejarlo vacío
    loadingText.textContent = "";
    
    // Agregar evento de clic a la Pokeball
    pokeball.addEventListener('click', () => {
        // Detener la animación de vibración suave
        pokeball.classList.remove('shake-effect');
        
        // Sin texto - mantener vacío
        loadingText.textContent = "";
        
        // Detener cualquier animación en curso antes de aplicar la nueva
        pokeball.style.animation = 'none';
        
        // Una pequeña pausa para asegurar que se aplique el cambio de animación
        setTimeout(() => {
            // Aplicar la animación de vibración fuerte (usar la existente)
            pokeball.style.animation = 'shake 0.5s ease-in-out';
            
            // Esperar a que termine la vibración fuerte antes de abrir
            setTimeout(() => {
                // Abrir la Pokeball y Pokédex al mismo tiempo
                pokeballTop.classList.add('open');
                pokeballBottom.classList.add('open');
                
                // Abrir la Pokédex simultáneamente
                if (pokedexTopHalf && pokedexBottomHalf) {
                    pokedexTopHalf.classList.add('open');
                    pokedexBottomHalf.classList.add('open');
                }
                
                // Dar más tiempo para que se complete la animación de apertura
                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');
                    
                    // Eliminar completamente después de que termine la transición
                    setTimeout(() => {
                        loadingOverlay.style.display = 'none';
                    }, 500);
                }, 2500);
            }, 500); // 500ms = duración de la animación de vibración fuerte
        }, 10);
    });
});

// Animar las estadísticas cuando se muestran los detalles
function animateStats() {
    const statFills = document.querySelectorAll('.modal.active .stat-fill');
    statFills.forEach((fill, index) => {
        // Aplicamos un retraso escalonado para que las barras se animen una tras otra
        setTimeout(() => {
            fill.style.animation = 'none'; // Reiniciar la animación
            void fill.offsetWidth; // Truco para forzar un reflow
            fill.style.animation = `enhancedFillBar 1.2s forwards cubic-bezier(0.11, 0.65, 0.33, 1)`;
        }, index * 120);
    });
    
    // Animar también otros elementos
    const infoSections = document.querySelectorAll('.modal.active .info-section');
    infoSections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.5s, transform 0.5s';
        
        setTimeout(() => {
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, 200 + (index * 150));
    });
}

// Animar los tipos de Pokémon
// Corregir la función para animar los tipos de Pokémon
function animateTypes() {
    const types = document.querySelectorAll('.modal.active .type-badge');
    
    types.forEach((type, index) => {
        // Restaurar opacidad inicial y eliminar animaciones previas
        type.style.opacity = '1';
        type.style.animation = 'none';
        
        // Forzar un reflow para que la nueva animación se aplique correctamente
        void type.offsetWidth;
        
        // Aplicar la animación popIn sin manipular la opacidad
        type.style.animation = 'popIn 0.3s forwards';
    });
}

// Modificar el evento de apertura de modal para incluir las animaciones
document.addEventListener('click', (e) => {
    if (e.target.closest('.pokemon-card')) {
        // Esperar a que el modal esté visible
        setTimeout(() => {
            animateStats();
            animateTypes();
        }, 300);
    }
});

// Modificar el renderizado de tarjetas para añadir efecto escalonado
function addStaggeredAnimation() {
    const cards = document.querySelectorAll('.pokemon-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.animation = 'fadeIn 0.5s ease-in forwards';
        }, 50 * index);
    });
}

// Observar cambios en el contenedor de la lista de Pokémon
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            if (document.querySelectorAll('.pokemon-card').length > 0) {
                addStaggeredAnimation();
            }
        }
    });
});

// Iniciar observación
observer.observe(document.getElementById('pokemonList'), { childList: true, subtree: true });