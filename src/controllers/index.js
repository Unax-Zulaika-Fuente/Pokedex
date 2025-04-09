class IndexController {
    constructor() {
        // Inicialización si es necesaria
    }

    home(req, res) {
        // Lógica para manejar la solicitud a la página principal
        res.send('Bienvenido a la página principal');
    }

    getResource(req, res) {
        // Lógica para manejar la solicitud de recursos
        res.send('Recursos obtenidos');
    }

    createResource(req, res) {
        // Lógica para manejar la creación de un recurso
        res.send('Recurso creado');
    }

    updateResource(req, res) {
        // Lógica para manejar la actualización de un recurso
        res.send('Recurso actualizado');
    }

    deleteResource(req, res) {
        // Lógica para manejar la eliminación de un recurso
        res.send('Recurso eliminado');
    }
}

export default IndexController;