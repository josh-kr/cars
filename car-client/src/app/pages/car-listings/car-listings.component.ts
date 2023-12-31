import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { debounceTime, merge, share, startWith, switchMap } from 'rxjs/operators';
import { Page, Car, Filter } from '../../services/models';
import { CarService } from '../../services/car.service';
import { FormGroup, FormControl } from '@angular/forms';
import { AddModalComponent } from './add-modal/add-modal.component';
import { ErsModalService } from '@ers-component-lib/components';
import { isNullOrUndefined } from 'util';

@Component({
  selector: 'app-car-listings',
  templateUrl: './car-listings.component.html',
  styleUrls: ['./car-listings.component.less'],
  encapsulation: ViewEncapsulation.None
})
export class CarListingsComponent implements OnInit {
  public paginatorOptions = {
    displayPaginator: true,
    itemsPerPageDropdown: true,
    itemsPerPage: 10,
    displayTotalItems: 'both',
    displayItemsPerPage: 'both',
    itemsPerPageList: [
      {
        label: '1',
        value: 1
      },
      {
        label: '10',
        value: 10
      },
      {
        label: '25',
        value: 25
      },
      {
        label: '50',
        value: 50
      },
      {
        label: 'All',
        value: 'all'
      }
    ],
  };
  public first = 0;
  public currentPage = 0;
  public sortMeta: any = {};
  public page: Observable<Page>;
  public pageUrl = new Subject<string>();
  public filter: BehaviorSubject<Filter> = new BehaviorSubject({
    page: {
      offset: 0,
      size: this.paginatorOptions.itemsPerPage,
    }
  });

  public filterableFields = {
    vin: '',
    make: ''
  };

  public displayUpload: boolean;
  public displayAdd: boolean;
  public gridFilterForm: FormGroup;
  @ViewChild('toast') toast: any;
  public toastController: HTMLKdsToastControllerElement;

  public filterUpdate = null;

  constructor(
    private carService: CarService,
    private ersModalService: ErsModalService
  ) {
    this.page = this.filter.asObservable().pipe(
      debounceTime(200),
      startWith(this.filter.value),
      merge(this.pageUrl),
      switchMap(urlOrFilter => this.carService.list(urlOrFilter)),
      share()
    );
  }

  ngOnInit() {
    this.toastController = this.toast.nativeElement;
    this.gridFilterForm = new FormGroup({
      make: new FormControl(''),
      vin: new FormControl(''),
      make_like: new FormControl('')
    });
  }

  deleteCar(car) {
    this.carService.deleteCar(car).subscribe((response) => {
      this.filter.next({ ...this.filter.value });
      this.toastController.createToast({
        message: 'You\'ve successfully deleted a car!',
        heading: 'Car Deleted',
        kind: 'success' // "error" | "info" | "success" | "warning"
      });
    }, (err) => {
      console.error('Delete Error', err.error.errors.reason);
      this.toastController.createToast({
        message: err.error.errors.reason,
        heading: 'Error deleting car',
        kind: 'error' // "error" | "info" | "success" | "warning"
      });
    });
  }

  editCar(car) {
    console.log('edit car', car);
  }

  _handlePageChange(event) {
    this.currentPage = event.currentPage;
    this.paginatorOptions.itemsPerPage = event.itemsPerPage;
    this.first = (this.currentPage - 1) * this.paginatorOptions.itemsPerPage;

    this.filter.next({
      ...this.filter.value, ...
      {
        page: {
          offset: this.first,
          size: this.paginatorOptions.itemsPerPage,
        }
      }
    }
    );
    return false;
  }

  _isFieldSorted(field) {
    return this.sortMeta.field === field;
  }

  _isAscendingSortOrder(field) {
    if (this.sortMeta.field === field && this.sortMeta.order === 1) {
      return true;
    }
    if (this.sortMeta.field === field && this.sortMeta.order === 0) {
      return false;
    }
  }

  _sortHandler(event) {
    this.sortMeta = event;
    let order = 'asc';
    if (event.order === -1) {
      order = 'desc';
    }
    const sortUpdate = {
      ...this.filter.value,
      ...{ sort: `${event.field}[${order}]` }
    };
    this.filter.next(sortUpdate);
  }

  executeAction(event, type: string) {
    switch (type) {
      case 'Upload':
        this.displayUpload = true;
        this.displayAdd = false;
        break;
      case 'Add':
        // this.displayAdd = true;
        // this.displayUpload = false;
        // break;
        const newCarForm: FormGroup = new FormGroup({});
        const addModal = this.ersModalService.open(AddModalComponent, {
          data: {
            inputs: {
              newCarForm: newCarForm
            }, outputs: {}
          },
          config: {
            size: 'medium',
            header: 'Add Car',
            icon: 'kds-icon-delivery',
            acceptLabel: 'Save Car',
            cancelLabel: 'Cancel',
            displayCancelButton: true,
            primaryBtnType: 'primary',
          }
        }).subscribe(value => {
          console.log('value', value);
          if (!isNullOrUndefined(value)) { // accept button was clicked
            if (value.newCarForm.valid) {
              console.log('valid');
              return true;
            } else {
              console.log('in valid');
              return false;
            }
          }
          // this.returnedValue = value;
          // if(isnullOrUndefined(value))), cancel button was clicked
        });
        break;
      default:
        break;
    }
  }

  modalClosed(type) {
    // Force refresh of list
    if (type === 'reload') {
      this.toastController.createToast({
        message: '',
        heading: 'Car Import successful',
        kind: 'success' // "error" | "info" | "success" | "warning"
      });
    }
    this.filter.next({ ...this.filter.value });
  }

  columnFilter() {
    this.filterUpdate = {};
    Object.keys(this.gridFilterForm.controls).sort().forEach(key => {
      const columnFilterValue = this.gridFilterForm.controls[key].value;
      const keyVal = key.replace('_', '.'); // replace the underscore with a . for "like" search
      if (columnFilterValue) {
        this.filterUpdate[keyVal] = columnFilterValue;
      }
    });
    const newFilter = {
      ...this.filter.value,
      ...{ filter: this.filterUpdate },
      ...{
        page: {
          offset: 0,
          size: this.paginatorOptions.itemsPerPage,
        }
      }
    };
    this.filter.next(newFilter);
  }

  updateFilters(key) {
    const keyVal = key.replace('.', '_'); // replace the underscore with a . for "like" search
    this.gridFilterForm.controls[keyVal].setValue('');
    this.columnFilter();
  }



}
