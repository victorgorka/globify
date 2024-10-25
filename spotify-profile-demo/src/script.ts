const clientId = "cd2a95dd025e40d1a3b1464400c055f0"; // Reemplaza con tu client ID
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
    redirectToAuthCodeFlow(clientId);
} else if (sessionStorage.getItem("token")) {
    document.location =`http://localhost:5173/`;
}
else {
    const accessToken = await getAccessToken(clientId, code);
    sessionStorage.setItem("toke", accessToken);
    const profile = await fetchProfile(accessToken);
    populateUI(profile);
    await displayTopTracks(accessToken);
}

export async function getAccessToken(clientId: string, code: string): Promise<string> {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("code_verifier", verifier!);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

// Definición de la interfaz del perfil de usuario
interface SpotifyProfile {
    display_name: string;
    id: string;
    email: string;
    images: { url: string }[];
    uri: string;
    external_urls: { spotify: string };
    href: string;
}

async function fetchProfile(token: string): Promise<SpotifyProfile> {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json() as SpotifyProfile;
}

function populateUI(profile: SpotifyProfile) {
    document.getElementById("displayName")!.innerText = profile.display_name;
    if (profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar")!.appendChild(profileImage);
    }
    document.getElementById("id")!.innerText = profile.id;
    document.getElementById("email")!.innerText = profile.email;
    document.getElementById("uri")!.innerText = profile.uri;
    document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url")!.innerText = profile.href;
    document.getElementById("url")!.setAttribute("href", profile.href);
    document.getElementById("imgUrl")!.innerText = profile.images[0]?.url ?? '(no profile image)';
}

export async function redirectToAuthCodeFlow(clientId: string) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);
    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("scope", "user-read-private user-read-email user-top-read");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length: number) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier: string) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Función para hacer solicitudes a la API
async function fetchWebApi(endpoint: string, method: string, token: string, body?: any) {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        method,
        body: body ? JSON.stringify(body) : null
    });

    const responseData = await res.json();
    
    if (!res.ok) {
        console.error('Error en la API de Spotify:', responseData);
        throw new Error('Error en la solicitud a la API de Spotify');
    }

    return responseData;
}

// Obtener los top tracks
async function getTopTracks(token: string) {
    return (await fetchWebApi('v1/me/top/tracks?time_range=long_term&limit=5', 'GET', token)).items;
}

// Mostrar los top tracks en la UI
async function displayTopTracks(accessToken: string) {
    try {
        const topTracks = await getTopTracks(accessToken);
        const trackList = document.getElementById('top-tracks-list')!;
        
        topTracks.forEach(({ name, artists }: { name: string, artists: { name: string }[] }) => {
            const trackItem = document.createElement('li');
            trackItem.textContent = `${name} by ${artists.map(artist => artist.name).join(', ')}`;
            trackList.appendChild(trackItem);
        });
    } catch (error) {
        console.error('Error al obtener los top tracks:', error);
        alert('Hubo un problema al obtener los top tracks.');
    }
}

// Manejo de la funcionalidad de cierre de sesión
document.getElementById('logout-button')?.addEventListener('click', () => {
    localStorage.removeItem('verifier');
    location.reload();
});
