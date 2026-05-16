<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SGHV - INGRESO</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url('https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&q=80');
            background-size: cover;
            background-position: center;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e0e0e0;
            font-family: 'Segoe UI', sans-serif;
        }
        .card-login {
            background-color: rgba(26, 26, 26, 0.95);
            border: 2px solid #f39c12;
            width: 420px;
            padding: 40px;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
            border-radius: 8px;
        }
        .btn-militar {
            background-color: #f39c12;
            color: #000;
            font-weight: bold;
            border-radius: 4px;
            padding: 12px;
            border: none;
        }
        .form-control {
            background-color: rgba(68, 68, 68, 0.5);
            border: 1px solid #555;
            color: #fff;
        }
        .form-control:focus { background-color: rgba(85, 85, 85, 0.8); border-color: #f39c12; color: #fff; box-shadow: none; }
    </style>
</head>
<body>

<div class="card-login text-center">
    <h1 class="text-warning fw-bold mb-1">SGHV</h1>
    <h5 class="text-white-50 mb-4 small">SISTEMA DE GESTIÓN DE HORAS DE VUELO</h5>
    
    <div id="alertError" class="alert alert-danger d-none small p-2"></div>

    <form id="loginForm">
        <div class="mb-3">
            <input type="text" id="id_usuario" class="form-control" placeholder="USUARIO" required>
        </div>
        <div class="mb-4">
            <input type="password" id="password" class="form-control" placeholder="CONTRASEÑA" required>
        </div>
        <button type="submit" class="btn btn-militar w-100">INGRESAR AL SGHV</button>
    </form>
    <p class="mt-4 mb-0" style="font-size: 0.7rem; color: #666;">BRIAV33 - EJÉRCITO NACIONAL</p>
</div>

<script>
    localStorage.clear();

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id_usuario = document.getElementById('id_usuario').value.toUpperCase();
        const password = document.getElementById('password').value;
        const alertError = document.getElementById('alertError');

        try {
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_usuario, password })
            });
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = 'index.html';
            } else {
                alertError.innerText = data.message;
                alertError.classList.remove('d-none');
            }
        } catch (error) {
            alertError.innerText = "Error: El servidor SGHV no responde.";
            alertError.classList.remove('d-none');
        }
    });
</script>
</body>
</html>