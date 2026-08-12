// src/app/footer.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="app-footer">
      <div class="footer-content">
        © {{ year }} Vehga Inspections Private Limited — All rights reserved
      </div>
    </footer>
  `
})
export class FooterComponent {
  year = new Date().getFullYear();
}
