import { Component, signal } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonInput,
  IonButton, IonList, IonListHeader
} from '@ionic/angular/standalone';
import { NgIf, NgForOf, DatePipe } from '@angular/common';
import { ApiService } from '../../core/api';

@Component({
  selector: 'app-admin-relatorios',
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton,
    IonList, IonListHeader, NgIf, NgForOf, DatePipe
  ],
  templateUrl: './admin-relatorios.page.html',
  styleUrls: ['./admin-relatorios.page.scss']
})
export class AdminRelatoriosPage {
  // simples: strings cruas pro input type="date"/"number"
  date = signal<string>('');
  year = signal<number | null>(null);
  month = signal<number | null>(null);

  dailyData = signal<any | null>(null);
  monthlyData = signal<any | null>(null);
  loading = signal(false);
  msg = signal<string | null>(null);

  constructor(private api: ApiService) {}

  async loadDaily() {
    if (!this.date()) { this.msg.set('Informe uma data.'); return; }
    this.loading.set(true);
    this.msg.set(null);
    try {
      const data = await this.api.daily(this.date()).toPromise();
      this.dailyData.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMonthly() {
    const y = this.year(), m = this.month();
    if (!y || !m) { this.msg.set('Informe ano e mês.'); return; }
    this.loading.set(true);
    this.msg.set(null);
    try {
      const data = await this.api.monthly(String(y), String(m)).toPromise();
      this.monthlyData.set(data);
    } finally {
      this.loading.set(false);
    }
  }
}
