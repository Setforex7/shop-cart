getUserInfo = req => {

    if(!req.user) return req.reject(401, 'Unauthorized');

    return { id: req.user.id,
             roles: Object.keys(req.user.roles || {}) }
}

module.exports = { getUserInfo };