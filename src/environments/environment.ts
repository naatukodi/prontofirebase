export const environment = {
  production: true,
  // Which company this deployment serves. null = one site for both, so the user picks
  // at login. Set to 'vehga' or 'pronto' to pin a site to one brand and hide the
  // picker — that is the whole change needed to split into two hosting sites.
  defaultBrand: null as 'vehga' | 'pronto' | null,
  firebase: {
  apiKey: "AIzaSyAQcvVU4F-Pid__FAGgGSUH360EjaAOqNQ",
  authDomain: "prontofirebase.firebaseapp.com",
  projectId: "prontofirebase",
  storageBucket: "prontofirebase.firebasestorage.app",
  messagingSenderId: "1045526546178",
  appId: "1:1045526546178:web:534e7bfb27b3fa5e5d641b"
  },
  apiBaseUrl: 'https://prontobackend-bhdnbec2fvd3ecfk.eastus2-01.azurewebsites.net/api/',
  pdfApiBaseUrl: 'https://prontopdf-cxgxbvcjhcg6hdfz.eastus2-01.azurewebsites.net'
};
