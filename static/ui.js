var Content = React.createClass({displayName: 'Content',
  getInitialState: function() {
      return {targetCalories: 2000};
  },
  componentDidMount: function() {
    $.ajax({
      url: 'api',
	  type: "POST",
      dataType: 'json',
      cache: false,
      success: function(data) {
        this.setState(data);
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  render: function() {
    return (
      <input type="number" name="targetCalories" min="100" max="10000" value={this.state.targetCalories} />
    );
  }
});

React.render(
  <Content />,
  document.getElementById('content')
);
