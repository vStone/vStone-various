# = Class: %class
#
# Configure settings for %module
#
# == Parameters:
#
# $param::   description of parameter. default value if any.
#
# == Sample Usage:
#
#   class {'%class':
#     param => 'value'
#   }
#
class %class (
  $param = undef
){
  ## Copy paste snippets:
  # template("${module_name}/template.erb")
  # source => "puppet:///modules/${module_name}/file"

  $parameter = $param ? {
    undef   => $::operatingsystem ? {

    },
    default => $param,
  }

}

