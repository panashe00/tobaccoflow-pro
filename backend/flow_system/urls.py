"""
URL configuration for flow_system project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/', include('growers.urls')),
    path('api/', include('transporters.urls')),
    path('api/', include('buyers.urls')),
    path('api/', include('grades.urls')),
    path('api/', include('deductions.urls')),
    path('api/', include('saledates.urls')),
    path('api/', include('deliverynotes.urls')),
    path('api/', include('weighing.urls')),
    path('api/', include('growerdeductions.urls')),
    path('api/', include('ticketprocessing.urls')),
    path('api/', include('baleprocessing.urls')),
    path('api/', include('salesheets.urls')),
    path('api/', include('dispatch.urls')),
    path('api/', include('rejectedbales.urls')),
    path('api/', include('deletedtickets.urls')),
    path('api/', include('printsettings.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
