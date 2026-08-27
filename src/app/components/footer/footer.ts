// src/app/footer.component.ts
import { Component, inject } from '@angular/core';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="app-footer">
      <div class="footer-content">
        © {{ year }} {{ brand.profile().legalName }} — All rights reserved
      </div>
    </footer>
  `
})
export class FooterComponent {
  year = new Date().getFullYear();
  brand = inject(BrandService);
}
