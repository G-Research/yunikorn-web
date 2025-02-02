/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatCardModule} from '@angular/material/card';
import {RouterTestingModule} from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';

import {ErrorViewComponent} from './error-view.component';
import {CommonUtil} from '@app/utils/common.util';
import { MockNgxSpinnerService } from '@app/testing/mocks';
import { NgxSpinnerService } from 'ngx-spinner';

describe('ErrorViewComponent', () => {
  let component: ErrorViewComponent;
  let fixture: ComponentFixture<ErrorViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatCardModule, RouterTestingModule],
      declarations: [ErrorViewComponent],
      providers: [
        { provide: NgxSpinnerService, useValue: MockNgxSpinnerService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParams: {}
            }
          }
        }
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ErrorViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should clear stored queue and partition on init', () => {
    const setStoredQueueSpy = spyOn(CommonUtil, 'setStoredQueueAndPartition');
    component.ngOnInit();
    expect(setStoredQueueSpy).toHaveBeenCalledWith('');
  });
});
