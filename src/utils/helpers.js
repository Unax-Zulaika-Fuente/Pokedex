export const formatDate = (date) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Intl.DateTimeFormat('es-ES', options).format(date);
};

export const generateRandomId = () => {
    return Math.floor(Math.random() * 1000000).toString();
};

export const isEmpty = (value) => {
    return value === null || value === undefined || value === '';
};