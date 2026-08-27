// Local dev environment — used by `ng serve` (development configuration) only.
// `ng build` (production) keeps using environment.ts (Azure).
//
// Requires BOTH local services running:
//   ProntoBackend         → http://localhost:5221   (`dotnet run`)
//   ProntoPDFGeneration   → http://localhost:5297   (`dotnet run`)
//
// pdfApiBaseUrl used to point at deployed Azure while apiBaseUrl pointed local,
// so report downloads silently bypassed the local PDF service and no local change
// to report rendering could ever be seen.
export const environment = {
  production: false,
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
  apiBaseUrl: 'http://localhost:5221/api/',
  pdfApiBaseUrl: 'http://localhost:5297'
};
