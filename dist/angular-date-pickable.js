angular.module('jbDatePickable', [])
.directive('jbDatePickable', jbDatePickableDirective);

function jbDatePickableDirective () {
  return {
    restrict: 'E',
    templateUrl: 'angular-date-pickable.html',
    scope: {
      startDate: '=',
      endDate: '=',
      selectedDate: '=',
      selectedDateRange: '=',
      visibleMonths: '='
    },
    controllerAs: 'vm',
    controller: controller,
    bindToController: true,
  }

  function controller ($scope) {
    var vm = this;

    const DEFAULT_VISIBLE_MONTHS = 1;

    // properties
    vm.visibleDate = moment().startOf('month');
    vm.selectStartDate = moment(vm.startDate).toDate(); //  Cloned dates
    vm.selectEndDate = moment(vm.endDate).toDate();

    vm.setPrevMonth = setPrevMonth;
    vm.setNextMonth = setNextMonth;

    vm.selectDate = selectDate;
    vm.generateWeeks = generateWeeks;
    vm.isInRange = isInRange;
    vm.isSelected = isSelected;

    ////
    updateVisibleDates();
    updateSelectedDateRange(vm.startDate, vm.endDate);

    function updateVisibleDates () {
      vm.visibleDates = [moment(vm.visibleDate.toDate())];
      for(var i = 1; i < (vm.visibleMonths || DEFAULT_VISIBLE_MONTHS); i++) {
        vm.visibleDates.push(moment(vm.visibleDate.toDate()).add(i, 'month').startOf('month'));
      }
    }

    var weeksCache = {};

    function setPrevMonth() {
      vm.visibleDate = vm.visibleDate.add(-1, 'month').startOf('month'); 
      updateVisibleDates();
    }

    function setNextMonth() {
      vm.visibleDate = vm.visibleDate.add(1, 'month').startOf('month'); 
      updateVisibleDates();
    }

    function generateWeeks (date) {
      var start = date.clone().startOf('month'); 
      var end   = date.clone().endOf('month');

      var cacheKey = start.format('YYYY-MM');
      // check if we have already generated the days for this month, hacky memoization
      if (weeksCache[cacheKey])
        return weeksCache[cacheKey];

      var range = moment().range(start.startOf('week'), end.endOf('week'));

      var weeks = [];
      range.by('weeks', function(week) {
        var days = [];
        moment().range(week.clone().startOf('week'), week.clone().endOf('week')).by('days', function(day) {
          days.push(day.startOf('day').toDate()); 
        });
        weeks.push(days);
      });

      weeksCache[cacheKey] = weeks

      return weeks;
    }

    function selectDate(date) {
      // both dates are already selected, but user clicked a new date
      // reset them both
      if (vm.selectStartDate && vm.selectEndDate) {
        vm.selectEndDate = null;
        vm.selectStartDate = null;
        vm.selectedDateRange = null;
      }

      // both dates are unselected, select the start date
      if (!vm.selectStartDate && !vm.selectEndDate) {
        vm.selectStartDate = date;
        vm.selectedDate = date;
        return;
      }

      if (vm.selectStartDate && moment(date).isBefore(vm.selectStartDate)) {
        vm.selectEndDate = vm.selectStartDate;
        vm.selectStartDate = date;
        vm.selectedDate = date;
        updateSelectedDateRange();
        return;
      }

      if (vm.selectStartDate && moment(date).isAfter(vm.selectStartDate)) {
        vm.selectEndDate = date;
        updateSelectedDateRange();
        return;
      }

    }

    function updateSelectedDateRange () {
      if (vm.selectStartDate && vm.selectEndDate) {
        vm.selectedDateRange = moment().range(
            moment(vm.selectStartDate).startOf('day'),
            moment(vm.selectEndDate).endOf('day')
          );

        if (vm.startDate !== vm.selectStartDate)
          vm.startDate = vm.selectStartDate;

        if (vm.endDate !== vm.selectEndDate)
          vm.endDate = vm.selectEndDate;
      }
    }

    function isInRange (date) {
      if (!vm.selectedDateRange) return false;
      var is = false;
      var is = vm.selectedDateRange.contains(date);

      return is;
    }

    function isSelected (date) {

      if(vm.selectStartDate && moment(vm.selectStartDate).isSame(date, 'day'))
        return true;
      
      if(vm.selectEndDate && moment(vm.selectEndDate).isSame(date, 'day'))
        return true;

      return false;
    }

    //  The updateSelectedDateRange and updateVisibleDates functions need to be
    //  debounced because when both the start and end dates are changed at the
    //  same time, the first watch would stop the second from executing and the
    //  end date would not be set.
    var debounceUpdateSelectedDateRange = _.debounce(function() {
      updateVisibleDates();
      updateSelectedDateRange();
    }, 100);

    //  Watch for start and end date changes
    $scope.$watch(
      'vm.startDate',
      function(newStartDate, oldStartDate) {
        if (newStartDate !== oldStartDate && newStartDate !== vm.selectStartDate) {
          vm.visibleDate = moment(vm.startDate).startOf('month');
          vm.selectStartDate = vm.startDate;

          debounceUpdateSelectedDateRange();
        }
      }
    );

    $scope.$watch(
      'vm.endDate',
      function(newEndDate, oldEndDate) {
        if (newEndDate !== oldEndDate && newEndDate !== vm.selectEndDate) {
          vm.visibleDate = moment(vm.endDate).startOf('month');
          vm.selectEndDate = vm.endDate;

          debounceUpdateSelectedDateRange();
        }
      }
    );
  }
}

angular.module("jbDatePickable").run(["$templateCache", function($templateCache) {$templateCache.put("angular-date-pickable.html","<table ng-repeat=\"visibleDate in vm.visibleDates\" class=\"pickable__calendar\">\n  <thead>\n    <tr>\n      <th colspan=\"2\" ng-click=\"vm.setPrevMonth()\">&lt;</th>\n      <th colspan=\"3\">{{ visibleDate.toDate() | date:\'MMM yyyy\'}}</th>\n      <th colspan=\"2\" ng-click=\"vm.setNextMonth()\">&gt;</th>\n    </tr>\n\n    <tr>\n      <th>Su</th>\n      <th>Mo</th>\n      <th>Tu</th>\n      <th>We</th>\n      <th>Th</th>\n      <th>Fr</th>\n      <th>Sa</th>\n    </tr>\n  </thead>\n\n  <tbody>\n    <tr ng-repeat=\"week in vm.generateWeeks(visibleDate)\">\n      <td ng-repeat=\"day in week\" ng-click=\"vm.selectDate(day)\" \n        ng-class=\"{\'pickable__day--in-range\': vm.isInRange(day), \'pickable__day--selected\': vm.isSelected(day) }\">\n        {{ day | date:\'dd\' }}\n      </td>\n    </tr>\n  </tbody>\n</table>\n");}]);