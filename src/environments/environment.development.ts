// Local dev environment — used by `ng serve` (development configuration) only.
// `ng build` (production) keeps using environment.ts (Azure).
// Requires the local .NET backend running on http://localhost:5221.
export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyAQcvVU4F-Pid__FAGgGSUH360EjaAOqNQ",
    authDomain: "prontofirebase.firebaseapp.com",
    projectId: "prontofirebase",
    storageBucket: "prontofirebase.firebasestorage.app",
    messagingSenderId: "1045526546178",
    appId: "1:1045526546178:web:534e7bfb27b3fa5e5d641b"
  },
  apiBaseUrl: 'http://localhost:5221/api/',
  pdfApiBaseUrl: 'https://prontopdf-cxgxbvcjhcg6hdfz.eastus2-01.azurewebsites.net'
};
