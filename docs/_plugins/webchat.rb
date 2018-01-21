class WebChat < Liquid::Tag
    Syntax = /^\s*([^\s]+)(\s+(\d+)\s+(\d+)\s*)?/
  
    def initialize(tagName, markup, tokens)
      super
  
      if markup =~ Syntax then
        @secret = $1
  
        if $2.nil? then
            @width = 560
            @height = 420
        else
            @width = $2.to_i
            @height = $3.to_i
        end
      else
        raise "No secrete in the \"webchat\" tag"
      end
    end
  
    def render(context)
      # "<iframe width=\"#{@width}\" height=\"#{@height}\" src=\"http://www.youtube.com/embed/#{@id}\" frameborder=\"0\"allowfullscreen></iframe>"
      "<iframe width=\"#{@width}\" height=\"#{@height}\" src=\"https://webchat.botframework.com/embed/carteiro-bot?s=#{@secret}\">&nbsp;</iframe>"
    end
  
    Liquid::Template.register_tag "webchat", self
  end