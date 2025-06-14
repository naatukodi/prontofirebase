// src/app/shared/shared.module.ts
import { NgModule } from '@angular/core';
import { MatExpansionModule }  from '@angular/material/expansion';
import { MatToolbarModule }    from '@angular/material/toolbar';
import { MatFormFieldModule }  from '@angular/material/form-field';
import { MatInputModule }      from '@angular/material/input';
import { MatButtonModule }     from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule }       from '@angular/material/icon';
import { MatCheckboxModule }   from '@angular/material/checkbox';
import { MatSelectModule }     from '@angular/material/select';
import { MatTabsModule }       from '@angular/material/tabs';
import { MatSnackBarModule }   from '@angular/material/snack-bar';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  exports: [
    MatExpansionModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatCheckboxModule,
    MatSelectModule,
    MatTabsModule,
    MatSnackBarModule,
    CommonModule,
    ReactiveFormsModule
  ]
})
export class SharedModule {}
