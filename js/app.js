/*global jQuery, Handlebars, Router */
jQuery(function ($) {
	'use strict';

	Handlebars.registerHelper('eq', function (a, b, options) {
		return a === b ? options.fn(this) : options.inverse(this);
	});

	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;

	var util = {
		uuid: function () {
			/*jshint bitwise:false */
			var i, random;
			var uuid = '';

			for (i = 0; i < 32; i++) {
				random = Math.random() * 16 | 0;
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
			}

			return uuid;
		},
		pluralize: function (count, word) {
			return count === 1 ? word : word + 's';
		},
		store: function (namespace, data) {
			if (arguments.length > 1) {
				return localStorage.setItem(namespace, JSON.stringify(data));
			} else {
				var store = localStorage.getItem(namespace);
				return (store && JSON.parse(store)) || [];
			}
		}
	};

	var App = {
		init: function () {
			this.todos = util.store('todos-jquery');
			this.todoTemplate = Handlebars.compile($('#todo-template').html());
			this.footerTemplate = Handlebars.compile($('#footer-template').html());
			this.bindEvents();

			new Router({
				'/:filer': function (filter) {
					this.filter = filter;
					this.render();
				}.bind(this)
			}).init('/all');
		},
		bindEvents: function () {
      var newTodo = document.querySelector('.new-todo');
      newTodo.addEventListener('keyup', this.create.bind(this));

      var toggleAll = document.querySelector('.toggle-all');
      toggleAll.addEventListener('change', this.toggleAll.bind(this));

      var footer = document.querySelector('.footer');
      footer.addEventListener('click', function(event) {
        if (event.target.className === 'clear-completed') {
          this.destroyCompleted();
        }
      }.bind(this));

      var todoList = document.querySelector('.todo-list');
      todoList.addEventListener('change', function(event) {
        if (event.target.className === 'toggle') {
          this.toggle(event);
        }
      }.bind(this));

      todoList.addEventListener('dblclick', function(event) {
        if(event.target.localName === 'label') {
          this.editingMode(event);
        }
      }.bind(this));

      todoList.addEventListener('keyup', function(event) {
        if(event.target.className === 'edit') {
          this.editKeyup(event);
        }
      }.bind(this));

      todoList.addEventListener('focusout', function(event) {
        if(event.target.className === 'edit') {
          this.update(event);
        }
      }.bind(this));

      todoList.addEventListener('click', function(event) {
        if(event.target.className === 'destroy') {
          this.destroy(event);
        }
      }.bind(this));

		},
		render: function () {
			var todos = this.getFilteredTodos();

      var todoList = document.querySelector('.todo-list');
      todoList.innerHTML = this.todoTemplate(todos);

      var main = document.querySelector('.main');
      if(todos.length > 0) {
        main.setAttribute('display', 'block');
      }

      var toggleAll = document.querySelector('.toggle-all');
      if (toggleAll.checked) {
        this.getActiveTodos().length === 0;
      }

			this.renderFooter();

      var newTodo = document.querySelector('.new-todo');
      newTodo.focus();
			util.store('todos-jquery', this.todos);
		},
		renderFooter: function () {
			var todoCount = this.todos.length;
			var activeTodoCount = this.getActiveTodos().length;
			var activeTodoCount = this.getActiveTodos().length;
			var template = this.footerTemplate({
				activeTodoCount: activeTodoCount,
				activeTodoWord: util.pluralize(activeTodoCount, 'item'),
				completedTodos: todoCount - activeTodoCount,
				filter: this.filter
			});

      var footer = document.querySelector('.footer');
      footer.style.display = 'none';
      if (todoCount > 0) {
        footer.style.display = 'block';
        footer.innerHTML = template;
      }
		},
		toggleAll: function (e) {
      var isChecked = e.target.checked;

			this.todos.forEach(function (todo) {
				todo.completed = isChecked;
			});

			this.render();
		},
		getActiveTodos: function () {
			return this.todos.filter(function (todo) {
				return !todo.completed;
			});
		},
		getCompletedTodos: function () {
			return this.todos.filter(function (todo) {
				return todo.completed;
			});
		},
		getFilteredTodos: function () {
			if (this.filter === 'active') {
				return this.getActiveTodos();
			}

			if (this.filter === 'completed') {
				return this.getCompletedTodos();
			}

			return this.todos;
		},
		destroyCompleted: function () {
			this.todos = this.getActiveTodos();
			this.render();
		},

		getIndexFromEl: function (el) {
			var id = el.closest('li').dataset.id;
			var todos = this.todos;
			var i = todos.length;

			while (i--) {
				if (todos[i].id === id) {
					return i;
				}
			}
		},
		create: function (e) {
			var input = e.target;
			var val = input.value.trim();

			if (e.which !== ENTER_KEY || !val) {
				return;
			}

			this.todos.push({
				id: util.uuid(),
				title: val,
				completed: false
			});

			input.value = '';

			this.render();
		},
		toggle: function (e) {
			var i = this.getIndexFromEl(e.target);
			this.todos[i].completed = !this.todos[i].completed;
			this.render();
		},
		editingMode: function (e) {
			var rawInput = e.target.closest('li');
			rawInput.setAttribute('class', 'editing');

			var input = rawInput.querySelector('.edit');
			var tmpStr = input.value;
			input.value = '';
			input.value = tmpStr;
			input.focus();
		},
		editKeyup: function (e) {
			if (e.which === ENTER_KEY) {
				e.target.blur();
			}

			if (e.which === ESCAPE_KEY) {
        var val = e.target;
        val.setAttribute('abort', true);
        val.blur();

			}
		},
		update: function (e) {
			var el = e.target;
      var val = el.value.trim();

			if (el.getAttribute('id') === 'abort') {
				el.setAttribute('abort', false);
			} else if (!val) {
				this.destroy(e);
				return;
			} else {
				this.todos[this.getIndexFromEl(el)].title = val;
			}

			this.render();
		},
		destroy: function (e) {
			this.todos.splice(this.getIndexFromEl(e.target), 1);
			this.render();
		}
	};

	App.init();


	// // Converting methods back to functions

	// // Util section
	// function uuid() {
	// 	/*jshint bitwise:false */
	// 	var i, random;
	// 	var uuid = '';

	// 	for (i = 0; i < 32; i++) {
	// 		random = Math.random() * 16 | 0;
	// 		if (i === 8 || i === 12 || i === 16 || i === 20) {
	// 			uuid += '-';
	// 		}
	// 		uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
	// 	}

	// 	return uuid;
	// }

	// function pluralize(count, word) {
	// 	return count === 1 ? word : word + 's';
	// }

	// function store (namespace, data) {
	// 	if (arguments.length > 1) {
	// 		return localStorage.setItem(namespace, JSON.stringify(data));
	// 	} else {
	// 		var store = localStorage.getItem(namespace);
	// 		return (store && JSON.parse(store)) || [];
	// 	}
	// }


	// // App section
	// var todos = store('todos-jquery');
	// var todoTemplate = Handlebars.compile($('#todo-template').html());
	// var footerTemplate = Handlebars.compile($('#footer-template').html());

	// function init() {
	// 	bindEvents();

	// 	new Router({
	// 		'/:status': function (status) {
	// 			todos.status = status;
	// 			render();
	// 		}
	// 	}).init('/all');
	// }

	// function bindEvents() {
	// 	$('.new-todo').on('keyup', create);
	// 	$('.toggle-all').on('change', toggleAll);
	// 	$('.footer').on('click', '.clear-completed', destroyCompleted);
	// 	$('.todo-list')
	// 		.on('change', '.toggle', toggle)
	// 		.on('dblclick', 'label', editingMode)
	// 		.on('keyup', '.edit', editKeyup)
	// 		.on('focusout', '.edit', update)
	// 		.on('click', '.destroy', destroy);
	// }

	// function render() {

	// 	var todos = getFilteredTodos();
	// 	$('.todo-list').html(todoTemplate(todos));
	// 	$('.main').toggle(todos.length > 0);
	// 	$('.toggle-all').prop('checked', getActiveTodos().length === 0);
	// 	renderFooter();
	// 	$('.new-todo').focus();
	// 	store('todos-jquery', todos);
	// }

	// function renderFooter() {
	// 	var todoCount = todos.length;
	// 	var activeTodoCount = getActiveTodos().length;
	// 	var template = footerTemplate({
	// 		activeTodoCount: activeTodoCount,
	// 		activeTodoWord: pluralize(activeTodoCount, 'item'),
	// 		completedTodos: todoCount - activeTodoCount,
	// 		status: todos.status
	// 	});

	// 	$('.footer').toggle(todoCount > 0).html(template);
	// }

	// function toggleAll(e) {
	// 	var isChecked = $(e.target).prop('checked');

	// 	todos.forEach(function (todo) {
	// 		todo.completed = isChecked;
	// 	});

	// 	render();
	// }

	// function getActiveTodos() {
	// 	return todos.filter(function (todo) {
	// 		return !todo.completed;
	// 	});
	// }

	// function getCompletedTodos() {
	// 	return todos.filter(function (todo) {
	// 		return todo.completed;
	// 	});
	// }

	// function getFilteredTodos() {
	// 	if (todos.status === 'active') {
	// 		return getActiveTodos();
	// 	}

	// 	if (todos.status === 'completed') {
	// 		return getCompletedTodos();
	// 	}

	// 	return todos;
	// }

	// function destroyCompleted() {
	// 	todos = getActiveTodos();
	// 	render();
	// }

	// function getIndexFromEl(el) {
	// 	var id = $(el).closest('li').data('id');
	// 	// var todos = todos;
	// 	var i = todos.length;

	// 	while (i--) {
	// 		if (todos[i].id === id) {
	// 			return i;
	// 		}
	// 	}
	// }

	// function create(e) {
	// 	var $input = $(e.target);
	// 	var val = $input.val().trim();

	// 	if (e.which !== ENTER_KEY || !val) {
	// 		return;
	// 	}

	// 	todos.push({
	// 		id: uuid(),
	// 		title: val,
	// 		completed: false
	// 	});

	// 	$input.val('');

	// 	render();
	// }

	// function toggle(e) {
	// 	var i = getIndexFromEl(e.target);
	// 	todos[i].completed = !todos[i].completed;
	// 	render();
	// }

	// function editingMode(e) {
	// 	var $input = $(e.target).closest('li').addClass('editing').find('.edit');
	// 	var tmpStr = $input.val();
	// 	$input.val('');
	// 	$input.val(tmpStr);
	// 	$input.focus();
	// }

	// function editKeyup(e) {
	// 	if (e.which === ENTER_KEY) {
	// 		e.target.blur();
	// 	}

	// 	if (e.which === ESCAPE_KEY) {
	// 		$(e.target).data('abort', true).blur();
	// 	}
	// }

	// function update(e) {
	// 	var el = e.target;
	// 	var $el = $(el);
	// 	var val = $el.val().trim();

	// 	if ($el.data('abort')) {
	// 		$el.data('abort', false);
	// 	} else if (!val) {
	// 		destroy(e);
	// 		return;
	// 	} else {
	// 		todos[getIndexFromEl(el)].title = val;
	// 	}

	// 	render();
	// }

	// function destroy(e) {
	// 	todos.splice(getIndexFromEl(e.target), 1);
	// 	render();
	// }

	// init();
});

