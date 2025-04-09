# Pokedex API

Una aplicación web que proporciona información detallada sobre Pokémon utilizando la [PokeAPI](https://pokeapi.co/). Este proyecto fue desarrollado principalmente utilizando GitHub Copilot con intervenciones mínimas.

![Pokedex Screenshot](./public/img/screenshot.png)

## Tecnologías Utilizadas

- **Backend**: Node.js con Express.js
- **Base de datos**: MongoDB con Mongoose
- **Frontend**: HTML, CSS y JavaScript vanilla
- **APIs**: PokeAPI
- **Testing**: Jest y Supertest

## Requisitos

- Node.js (versión 14 o superior)
- npm (versión 6 o superior)
- MongoDB (opcional, según configuración)

## Instalación

1. Clona el repositorio:
   ```
   git clone https://github.com/Unax-Zulaika-Fuente/copilot
   ```
2. Navega al directorio del proyecto:
   ```
   cd copilot
   ```
3. Instala las dependencias:
   ```
   npm install
   ```

## Ejecución

Para iniciar la aplicación, ejecuta el siguiente comando:
```
npm start
```

La aplicación se ejecutará en `http://localhost:3000`.

## Pruebas

Para ejecutar las pruebas unitarias:
```
npm test
```

## Características

- **Catálogo de Pokémon**: Visualización de la lista completa con paginación
- **Detalles de Pokémon**: Información detallada de cada Pokémon incluyendo estadísticas, habilidades y evoluciones
- **Búsqueda**: Filtrado por nombre o ID
- **API RESTful**: Endpoints para obtener información de Pokémon

## Estructura del Proyecto

- `src/index.js`: Punto de entrada de la aplicación.
- `src/controllers/index.js`: Controladores para manejar las solicitudes.
- `src/models/index.js`: Modelos que representan la estructura de los datos.
- `src/utils/helpers.js`: Funciones utilitarias.
- `src/config/config.js`: Configuración de la aplicación.
- `test/index.test.js`: Pruebas unitarias para el archivo index.js.

## API de Pokémon

Este proyecto incluye integración con la PokeAPI. Puedes acceder a las siguientes rutas:

- `GET /api/pokemon`: Obtiene una lista de Pokémon (acepta parámetros query `limit` y `offset`)
- `GET /api/pokemon/id/:id`: Obtiene información detallada de un Pokémon por su ID
- `GET /api/pokemon/name/:name`: Obtiene información detallada de un Pokémon por su nombre

## Contribuciones

Las contribuciones son bienvenidas. Si deseas contribuir, por favor abre un issue o envía un pull request.

## Licencia

Este proyecto está bajo la Licencia MIT.