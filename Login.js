function Login({ onLogin }) {
    const [user, setUser] = React.useState('');
    const [pass, setPass] = React.useState('');

    const entrar = (e) => {
        e.preventDefault();
        // Usuario: admin | Clave: 1234
        if(user === 'admin' && pass === '1234') {
            onLogin(true);
        } else {
            alert('Credenciales incorrectas');
        }
    };

    return (
        <div className="container d-flex justify-content-center align-items-center vh-100">
            <div className="card card-militar shadow-lg p-4" style={{width: '400px'}}>
                <h2 className="text-center mb-4 text-warning fw-bold">BRIAV33</h2>
                <form onSubmit={entrar}>
                    <div className="mb-3">
                        <label className="form-label">Usuario</label>
                        <input type="text" className="form-control" onChange={(e)=>setUser(e.target.value)} placeholder="Grado y Apellido" />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Contraseña</label>
                        <input type="password" className="form-control" onChange={(e)=>setPass(e.target.value)} placeholder="••••" />
                    </div>
                    <button type="submit" className="btn btn-operativo w-100">INGRESAR</button>
                </form>
            </div>
        </div>
    );
}