package com.project.avisensandroid.ui.fragments

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import androidx.core.content.ContextCompat
import com.project.avisensandroid.R

class GraficaCrecimiento(context: Context, attrs: AttributeSet?) : View(context, attrs) {
    var unidadPeso = false
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var series = emptyList<List<Pair<Int,Double>>>()
    private var low = emptyList<Pair<Int,Double>>()
    private var high = emptyList<Pair<Int,Double>>()
    private var target: Double? = null
    fun mostrar(s: List<List<Pair<Int,Double>>>, a: List<Pair<Int,Double>> = emptyList(), b: List<Pair<Int,Double>> = emptyList(), t: Double? = null) { series=s; low=a; high=b; target=t; invalidate() }
    override fun onDraw(c: Canvas) {
        super.onDraw(c)
        val d=resources.displayMetrics.density; val left=52*d; val right=width-12*d; val top=12*d; val bottom=height-26*d
        if(right<=left || bottom<=top) return
        val all=series.flatten()+low+high; val maxX=maxOf(1,all.maxOfOrNull { it.first } ?: 1); val maxDato=maxOf(1.0,all.maxOfOrNull { it.second } ?: 1.0,target ?: 0.0); val paso=if(unidadPeso) maxOf(1000.0, kotlin.math.ceil(maxDato/4000.0)*1000.0) else maxDato/4; val maxY=paso*4
        fun x(v:Int)=left+(right-left)*v/maxX
        fun y(v:Double)=bottom-((bottom-top)*v/maxY).toFloat()
        paint.color=ContextCompat.getColor(context,R.color.text_primary); paint.textSize=10*d; paint.strokeWidth=d
        for(i in 0..4){ val v=maxY*i/4; paint.alpha=55;c.drawLine(left,y(v),right,y(v),paint);paint.alpha=255;c.drawText(if(unidadPeso) String.format(java.util.Locale("es","CO"),"%.0f kg",v/1000) else String.format(java.util.Locale("es","CO"),"%.1f",v),2*d,y(v)+3*d,paint);c.drawText((maxX*i/4).toString(),x(maxX*i/4),bottom+14*d,paint) }
        if(low.isNotEmpty() && high.isNotEmpty()){ val path=Path(); path.moveTo(x(low.first().first),y(low.first().second));low.forEach{path.lineTo(x(it.first),y(it.second))};high.asReversed().forEach{path.lineTo(x(it.first),y(it.second))};path.close();paint.color=Color.argb(40,65,135,210);c.drawPath(path,paint) }
        val colors=intArrayOf(Color.rgb(48,150,96),Color.rgb(70,140,220),Color.GRAY,Color.rgb(220,145,50));paint.strokeWidth=2*d
        series.forEachIndexed { i,s -> paint.color=colors[i%colors.size];paint.pathEffect=if(i==1) DashPathEffect(floatArrayOf(6*d,4*d),0f) else null;s.zipWithNext().forEach{(a,b)->c.drawLine(x(a.first),y(a.second),x(b.first),y(b.second),paint)};paint.pathEffect=null;if(i==0)s.forEach{c.drawCircle(x(it.first),y(it.second),3*d,paint)} }
        target?.let { paint.color=Color.rgb(220,75,75);paint.pathEffect=DashPathEffect(floatArrayOf(4*d,4*d),0f);c.drawLine(left,y(it),right,y(it),paint);paint.pathEffect=null }
    }
}
