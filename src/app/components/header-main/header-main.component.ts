import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { I18nService } from '@core/i18n.service';
import { Router } from '@angular/router';
import { includes } from 'lodash';
declare const require: any;

@Component({
  selector: 'app-header-main',
  templateUrl: './header-main.component.html',
  styleUrls: ['./header-main.component.less']
})
export class HeaderMainComponent implements OnInit {
  consoleName: string = this.i18n.getById('consoleName');
  helpSvg = require("../../../assets/help.svg");
  apiSvg = require("../../../assets/api.svg");
  logoSvg = require("../../../assets/model-arts-logo.svg");
  helpText: string = this.i18n.getById('common.help');
  @Input() active = "";

  @ViewChild('exampleDisplay') target;

  constructor(private i18n: I18nService, private router: Router) { }
  ngOnInit(): void { }

  click(tab: string): void {
    this.active;
    if (this.active === tab) {
      location.reload();
    }
    if (tab === 'editor') {
      this.goMain();
    } else if (tab === 'example') {
      this.goExample();
    } else if (tab === 'task') {
      this.goTask();
    } else {
      this.goFirst();
    }
  }

  goMain(): void {
    this.router.navigateByUrl("main");
  }

  goFirst(): void {
    this.router.navigateByUrl("");
  }

  goTask(): void {
    this.router.navigateByUrl("management");
  }

  goExample = () => {
    this.router.navigateByUrl("solution");
  }

}